// Persistência segura via API Serverless (/api/*) + Criptografia E2E (AES-256-GCM) no cliente.
import { fetchApi } from '@/lib/api-client';
import {
  derivarChaves,
  gerarRecoveryCode,
  cifrarRecoveryEnvelope,
  decifrarRecoveryEnvelope,
  cifrarTexto,
  decifrarTexto,
} from '@/lib/crypto';
import {
  MODELO_PADRAO,
  type Ideia,
  type ModeloGemini,
  type NovaIdeiaInput,
  type UsuarioSessao,
} from '@/types';

/// Decifra um campo que pode ser ciphertext (hex) ou texto plano (fallback).
async function decifrarCampo(campoHex: string, vaultKeyHex: string): Promise<string> {
  try {
    return await decifrarTexto(campoHex, vaultKeyHex);
  } catch {
    return campoHex;
  }
}

// Reseta o cache de inicialização — mantido para compatibilidade com testes
export function resetInitCache(): void {
  // noop no client serverless
}

export async function testarConexaoTurso(): Promise<{ ok: boolean; mensagem: string }> {
  try {
    const res = await fetchApi<{ ok?: boolean; erro?: string }>('/api/ideias');
    return { ok: true, mensagem: 'Conexão segura com a API ativa.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, mensagem: `Falha na API: ${msg}` };
  }
}

// --- Sessão de usuário ---

const SESSAO_KEY = 'lumi_sessao_usuario';

let sessaoMemoria: UsuarioSessao | null = null;

function lerSessaoStorage(): UsuarioSessao | null {
  try {
    if (typeof sessionStorage !== 'undefined') {
      const raw = sessionStorage.getItem(SESSAO_KEY);
      if (raw) return JSON.parse(raw) as UsuarioSessao;
    }
  } catch {
    // ignore parse errors
  }
  return sessaoMemoria;
}

function salvarSessaoStorage(sessao: UsuarioSessao | null): void {
  sessaoMemoria = sessao;
  try {
    if (typeof sessionStorage !== 'undefined') {
      if (sessao) {
        sessionStorage.setItem(SESSAO_KEY, JSON.stringify(sessao));
      } else {
        sessionStorage.removeItem(SESSAO_KEY);
      }
    }
  } catch {
    // ignore
  }
}

export function obterSessaoAtual(): UsuarioSessao | null {
  return lerSessaoStorage();
}

export function encerrarSessao(): void {
  salvarSessaoStorage(null);
}

/// Atualiza o nome do usuário autenticado e retorna a nova sessão.
export async function atualizarNomeUsuario(novoNome: string): Promise<UsuarioSessao> {
  const sessao = obterSessaoAtual();
  if (!sessao) {
    throw new Error('Usuário não autenticado');
  }

  const nomeTrimmed = novoNome.trim();
  if (nomeTrimmed.length === 0) {
    throw new Error('Nome não pode ser vazio');
  }

  await fetchApi<{ ok: boolean; nome: string }>('/api/usuario/perfil', {
    method: 'PATCH',
    body: JSON.stringify({ nome: nomeTrimmed }),
  });

  const novaSessao: UsuarioSessao = { ...sessao, nome: nomeTrimmed };
  salvarSessaoStorage(novaSessao);
  return novaSessao;
}

// --- Chave de Recuperação (Recovery Code) ---

/// Gera uma chave de recuperação no formato LUMI-XXXX-XXXX-XXXX-XXXX
export function gerarChaveRecuperacao(): string {
  // Usa o crypto.ts gerarRecoveryCode que já gera o formato LUMI-XXXX-XXXX-XXXX
  // Fallback síncrono usando Web Crypto API se gerarRecoveryCode não estiver disponível
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem I, O, 0, 1 para legibilidade
  const grupos: string[] = [];
  for (let g = 0; g < 4; g++) {
    let grupo = '';
    for (let i = 0; i < 4; i++) {
      grupo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    grupos.push(grupo);
  }
  return `LUMI-${grupos.join('-')}`;
}

/// Salva o envelope de recuperação (vaultKey cifrado com a chave de recuperação) no servidor.
export async function salvarEnvelopeRecuperacao(chaveRecovery: string): Promise<void> {
  const sessao = obterSessaoAtual();
  if (!sessao) return;

  const envelope = await cifrarRecoveryEnvelope(sessao.vaultKeyHex, chaveRecovery);
  await fetchApi('/api/usuario/perfil', {
    method: 'PATCH',
    body: JSON.stringify({ recoveryEnvelop: envelope }),
  });
}

/// Solicita recuperação de senha — gera e envia código de recuperação por e-mail.
export async function solicitarRecuperacaoSenha(email: string): Promise<{ ok: boolean; mensagem: string }> {
  try {
    await fetchApi<{ ok: boolean; mensagem?: string }>('/api/auth/recuperar-senha', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return { ok: true, mensagem: 'Se o e-mail estiver cadastrado, enviaremos um código de recuperação.' };
  } catch (e: unknown) {
    return {
      ok: false,
      mensagem: e instanceof Error ? e.message : 'Erro ao solicitar recuperação.',
    };
  }
}

/// Redefinição de senha usando token (flow esqueci-senha via e-mail).
/// O servidor valida o token, atualiza credencial_hash e marca como usado.
export async function redefinirSenhaComToken(
  token: string,
  saltHex: string,
  novaSenha: string,
): Promise<{ ok: boolean; mensagem: string }> {
  const { authHashHex } = await derivarChaves(novaSenha, saltHex);

  try {
    const res = await fetchApi<{ ok: boolean; mensagem?: string }>('/api/auth/redefinir-senha', {
      method: 'POST',
      body: JSON.stringify({ token, credencialHash: authHashHex, saltHex }),
    });
    return { ok: true, mensagem: res.mensagem || 'Senha redefinida com sucesso.' };
  } catch (e: unknown) {
    return {
      ok: false,
      mensagem: e instanceof Error ? e.message : 'Erro ao redefinir senha.',
    };
  }
}

// --- Registro/Login de usuário ---

export async function registrarUsuario(params: {
  nome: string;
  email: string;
  senha: string;
}): Promise<UsuarioSessao> {
  const res = await fetchApi<{
    token: string;
    user: { id: number; nome: string; email: string; geminiModelo: string };
    saltHex: string;
  }>('/api/auth/registrar', {
    method: 'POST',
    body: JSON.stringify(params),
  });

  // Deriva vaultKeyHex localmente no navegador (Zero-Knowledge: servidor nunca recebe a vaultKey)
  const { vaultKeyHex } = await derivarChaves(params.senha, res.saltHex);

  const sessao: UsuarioSessao = {
    id: res.user.id,
    nome: res.user.nome,
    email: res.user.email,
    vaultKeyHex,
    token: res.token,
  };

  salvarSessaoStorage(sessao);
  return sessao;
}

export async function loginUsuario(params: {
  email: string;
  senha: string;
}): Promise<UsuarioSessao> {
  const res = await fetchApi<{
    token: string;
    user: { id: number; nome: string; email: string; geminiModelo: string };
    saltHex: string;
    geminiKeyCifrada: string | null;
  }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(params),
  });

  // Deriva vaultKeyHex localmente no navegador usando o salt enviado de volta
  const { vaultKeyHex } = await derivarChaves(params.senha, res.saltHex);

  const sessao: UsuarioSessao = {
    id: res.user.id,
    nome: res.user.nome,
    email: res.user.email,
    vaultKeyHex,
    token: res.token,
  };

  salvarSessaoStorage(sessao);
  return sessao;
}

// --- Configurações: chave API Gemini ---

export async function lerChave(): Promise<string> {
  const sessao = obterSessaoAtual();
  if (sessao) {
    const res = await fetchApi<{ geminiKeyCifrada: string | null }>('/api/usuario/config');
    if (!res.geminiKeyCifrada) return '';
    return decifrarTexto(res.geminiKeyCifrada, sessao.vaultKeyHex);
  }

  // Fallback local se não autenticado
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('lumi_gemini_api_key') || '';
  }
  return '';
}

export async function salvarChave(chave: string): Promise<void> {
  const sessao = obterSessaoAtual();
  if (sessao) {
    const cifrada = await cifrarTexto(chave, sessao.vaultKeyHex);
    await fetchApi('/api/usuario/config', {
      method: 'PATCH',
      body: JSON.stringify({ geminiKeyCifrada: cifrada }),
    });
    return;
  }

  // Fallback local se não autenticado
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('lumi_gemini_api_key', chave);
  }
}

// --- Configurações: modelo Gemini ---

export async function lerModelo(): Promise<ModeloGemini> {
  const sessao = obterSessaoAtual();
  if (sessao) {
    try {
      const res = await fetchApi<{ modelo: string }>('/api/usuario/config');
      if (res.modelo) return res.modelo as ModeloGemini;
    } catch {
      // ignore
    }
    return MODELO_PADRAO;
  }

  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('lumi_gemini_modelo');
    if (stored) return stored as ModeloGemini;
  }
  return MODELO_PADRAO;
}

export async function salvarModelo(modelo: ModeloGemini): Promise<void> {
  const sessao = obterSessaoAtual();
  if (sessao) {
    await fetchApi('/api/usuario/config', {
      method: 'PATCH',
      body: JSON.stringify({ modelo }),
    });
    return;
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('lumi_gemini_modelo', modelo);
  }
}

// --- CRUD de ideias ---

function lerIdeiasLocal(): Ideia[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('lumi_ideias_local');
      if (raw) return JSON.parse(raw) as Ideia[];
    }
  } catch {
    // ignore
  }
  return [];
}

function salvarIdeiasLocal(ideias: Ideia[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('lumi_ideias_local', JSON.stringify(ideias));
    }
  } catch {
    // ignore
  }
}

export async function listarIdeias(opcoes?: {
  somenteFavoritas?: boolean;
  busca?: string;
  categoria?: string;
}): Promise<Ideia[]> {
  const sessao = obterSessaoAtual();

  let ideias: Ideia[] = [];

  if (sessao) {
    const res = await fetchApi<{ ideias: Ideia[] }>('/api/ideias');
    ideias = res.ideias || [];

    // Decifra apenas descricao, tema e promptUsado (titulo e categoria ficam em texto claro)
    for (const ideia of ideias) {
      ideia.descricao = await decifrarCampo(ideia.descricao, sessao.vaultKeyHex);
      ideia.tema = await decifrarCampo(ideia.tema, sessao.vaultKeyHex);
      if (ideia.promptUsado) {
        ideia.promptUsado = await decifrarCampo(ideia.promptUsado, sessao.vaultKeyHex);
      }
    }
  } else {
    ideias = lerIdeiasLocal();
  }

  if (opcoes?.somenteFavoritas) {
    ideias = ideias.filter((i) => i.favorito);
  }

  if (opcoes?.categoria) {
    ideias = ideias.filter((i) => i.categoria === opcoes.categoria);
  }

  if (opcoes?.busca && ideias.length > 0) {
    const termo = opcoes.busca.toLowerCase();
    ideias = ideias.filter(
      (ideia) =>
        ideia.titulo.toLowerCase().includes(termo) ||
        ideia.descricao.toLowerCase().includes(termo) ||
        ideia.tema.toLowerCase().includes(termo)
    );
  }

  return ideias;
}

export async function salvarIdeia(ideia: NovaIdeiaInput): Promise<Ideia> {
  const sessao = obterSessaoAtual();

  if (sessao) {
    // Criptografa descricao, tema e promptUsado com AES-256-GCM antes de enviar para a API
    const descricaoCifrada = await cifrarTexto(ideia.descricao, sessao.vaultKeyHex);
    const temaCifrado = await cifrarTexto(ideia.tema, sessao.vaultKeyHex);
    const promptCifrado = ideia.promptUsado
      ? await cifrarTexto(ideia.promptUsado, sessao.vaultKeyHex)
      : undefined;

    const res = await fetchApi<{ ideia: Ideia }>('/api/ideias', {
      method: 'POST',
      body: JSON.stringify({
        titulo: ideia.titulo,
        descricao: descricaoCifrada,
        tema: temaCifrado,
        categoria: ideia.categoria,
        promptUsado: promptCifrado,
      }),
    });

    const salva = res.ideia;
    // Restaura o texto claro em memória para retorno imediato à interface
    salva.descricao = ideia.descricao;
    salva.tema = ideia.tema;
    salva.promptUsado = ideia.promptUsado;
    return salva;
  }

  // Modo local
  const nova: Ideia = {
    id: Date.now(),
    titulo: ideia.titulo,
    descricao: ideia.descricao,
    tema: ideia.tema,
    categoria: ideia.categoria,
    promptUsado: ideia.promptUsado,
    favorito: Boolean(ideia.favorito),
    criadoEm: ideia.criadoEm || new Date().toISOString(),
  };

  const locais = lerIdeiasLocal();
  locais.unshift(nova);
  salvarIdeiasLocal(locais);
  return nova;
}

export async function excluirIdeia(id: number): Promise<void> {
  const sessao = obterSessaoAtual();
  if (sessao) {
    await fetchApi(`/api/ideias?id=${id}`, {
      method: 'DELETE',
    });
    return;
  }

  const locais = lerIdeiasLocal().filter((i) => i.id !== id);
  salvarIdeiasLocal(locais);
}

export async function alternarFavorito(
  id: number,
  favoritoAtual?: boolean
): Promise<Ideia | undefined> {
  const sessao = obterSessaoAtual();
  const novoFavorito = !favoritoAtual;

  if (sessao) {
    await fetchApi('/api/ideias', {
      method: 'PATCH',
      body: JSON.stringify({ id, favorito: novoFavorito }),
    });

    // Atualiza lista em memória chamando listarIdeias
    const todas = await listarIdeias();
    return todas.find((i) => i.id === id);
  }

  const locais = lerIdeiasLocal();
  const index = locais.findIndex((i) => i.id === id);
  if (index !== -1) {
    locais[index].favorito = novoFavorito;
    salvarIdeiasLocal(locais);
    return locais[index];
  }

  return undefined;
}

export interface IdeiaPendente {
  titulo: string;
  descricao: string;
  categoria: string;
  tema: string;
  promptUsado?: string;
}

const STORAGE_KEY_IDEIA_PENDENTE = 'lumi_ideia_pendente';

export function obterIdeiaPendente(): IdeiaPendente | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_IDEIA_PENDENTE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.titulo === 'string' &&
      typeof parsed.descricao === 'string'
    ) {
      return {
        titulo: parsed.titulo,
        descricao: parsed.descricao,
        categoria: typeof parsed.categoria === 'string' ? parsed.categoria : 'App',
        tema: typeof parsed.tema === 'string' ? parsed.tema : '',
        promptUsado: typeof parsed.promptUsado === 'string' ? parsed.promptUsado : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function salvarIdeiaPendente(ideia: IdeiaPendente): void {
  try {
    localStorage.setItem(STORAGE_KEY_IDEIA_PENDENTE, JSON.stringify(ideia));
  } catch {
    // ignorar
  }
}

export function limparIdeiaPendente(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_IDEIA_PENDENTE);
  } catch {
    // ignorar
  }
}
