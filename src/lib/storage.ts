// Persistência de tudo no TursoDB.
// - gemini_api_key e gemini_modelo → tabela configuracoes (modo legado)
//   OU tabela usuarios (modo autenticado)
// - ideias → tabela ideias
import { execute, query, initTurso, rowToIdeia, testarConexaoTurso as _testarConexaoTurso } from '@/lib/turso';
import {
  gerarSaltHex,
  derivarChaves,
  derivarHashLegado,
  aplicarPepper,
  verificarArgon2id,
  cifrarTexto,
  decifrarTexto,
  constantTimeEquals,
} from '@/lib/crypto';
import { MODELO_PADRAO, type Ideia, type ModeloGemini, type NovaIdeiaInput, type UsuarioSessao } from '@/types';

// Re-exporta testarConexaoTurso para uso em componentes
export { testarConexaoTurso } from '@/lib/turso';

// Garante tabelas existam antes de qualquer operação
let initPromise: Promise<void> | null = null;
function ensureInit(): Promise<void> {
  if (!initPromise) {
    initPromise = initTurso().catch((err) => {
      initPromise = null;
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Não foi possível inicializar o banco Turso (${msg})`);
    });
  }
  return initPromise!;
}

// Reseta o cache de inicialização — útil para testes unitários
export function resetInitCache(): void {
  initPromise = null;
}

// --- Sessão de usuário ---

const SESSAO_KEY = 'gerador_ideias_sessao';

// Armazenamento em memória para fallback em testes (onnde não há sessionStorage)
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

// --- Registro/Login de usuário ---

export async function registrarUsuario(params: {
  nome: string;
  email: string;
  senha: string;
}): Promise<UsuarioSessao> {
  await ensureInit();

  const saltHex = await gerarSaltHex();
  const { authHashHex, vaultKeyHex } = await derivarChaves(params.senha, saltHex);
  const emailLower = params.email.toLowerCase();
  const criadoEm = new Date().toISOString();

  const rows = await query<Record<string, unknown>>(
    `INSERT INTO usuarios (nome, email, salt, credencial_hash, gemini_key_cifrada, gemini_modelo, criado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     RETURNING *`,
    [
      params.nome,
      emailLower,
      saltHex,
      authHashHex,
      null,
      MODELO_PADRAO,
      criadoEm,
    ],
  );

  if (rows.length === 0) {
    throw new Error('Falha ao registrar usuário');
  }

  const row = rows[0];
  const sessao: UsuarioSessao = {
    id: Number(row.id),
    nome: String(row.nome),
    email: String(row.email),
    vaultKeyHex,
  };

  salvarSessaoStorage(sessao);
  return sessao;
}

export async function loginUsuario(params: {
  email: string;
  senha: string;
}): Promise<UsuarioSessao> {
  await ensureInit();

  const emailLower = params.email.toLowerCase();

  const rows = await query<Record<string, unknown>>(
    'SELECT * FROM usuarios WHERE email = ?',
    [emailLower],
  );

  if (rows.length === 0) {
    throw new Error('E-mail ou senha inválidos');
  }

  const row = rows[0];
  const senhaPeppered = await aplicarPepper(params.senha);

  let autenticado: boolean;
  let vaultKeyHex: string;
  const credHash = String(row.credencial_hash);
  if (credHash.startsWith('$argon2')) {
    autenticado = await verificarArgon2id(senhaPeppered, credHash);
    ({ vaultKeyHex } = await derivarChaves(params.senha, String(row.salt)));
  } else {
    // Fallback legado: hash opaco sem prefixo (64 hex chars)
    const authHashHex = await derivarHashLegado(params.senha, String(row.salt));
    ({ vaultKeyHex } = await derivarChaves(params.senha, String(row.salt)));
    autenticado = constantTimeEquals(authHashHex, credHash);
  }

  if (!autenticado) {
    throw new Error('E-mail ou senha inválidos');
  }

  const sessao: UsuarioSessao = {
    id: Number(row.id),
    nome: String(row.nome),
    email: String(row.email),
    vaultKeyHex,
  };

  salvarSessaoStorage(sessao);
  return sessao;
}

// --- Configurações: chave API Gemini ---

export async function lerChave(): Promise<string> {
  await ensureInit();

  const sessao = obterSessaoAtual();
  if (sessao) {
    const rows = await query<{ gemini_key_cifrada: string }>(
      'SELECT gemini_key_cifrada FROM usuarios WHERE id = ?',
      [sessao.id],
    );
    const cifrada = rows[0]?.gemini_key_cifrada;
    if (!cifrada) return '';
    return decifrarTexto(cifrada, sessao.vaultKeyHex);
  }

  // Modo legado: configurações
  const rows = await query<{ valor: string }>(
    'SELECT valor FROM configuracoes WHERE chave = ?',
    ['gemini_api_key'],
  );
  return rows[0]?.valor ?? '';
}

export async function salvarChave(chave: string): Promise<void> {
  await ensureInit();

  const sessao = obterSessaoAtual();
  if (sessao) {
    const cifrada = await cifrarTexto(chave, sessao.vaultKeyHex);
    await execute(
      'UPDATE usuarios SET gemini_key_cifrada = ? WHERE id = ?',
      [cifrada, sessao.id],
    );
    return;
  }

  // Modo legado: tabela configuracoes
  await execute(
    'INSERT INTO configuracoes (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor',
    ['gemini_api_key', chave],
  );
}

// --- Configurações: modelo Gemini ---

export async function lerModelo(): Promise<ModeloGemini> {
  await ensureInit();

  const sessao = obterSessaoAtual();
  if (sessao) {
    const rows = await query<{ gemini_modelo: string }>(
      'SELECT gemini_modelo FROM usuarios WHERE id = ?',
      [sessao.id],
    );
    const stored = rows[0]?.gemini_modelo;
    if (stored) return stored as ModeloGemini;
    return MODELO_PADRAO;
  }

  // Modo legado: tabela configuracoes
  const rows = await query<{ valor: string }>(
    'SELECT valor FROM configuracoes WHERE chave = ?',
    ['gemini_modelo'],
  );
  const stored = rows[0]?.valor;
  if (stored) return stored as ModeloGemini;
  return MODELO_PADRAO;
}

export async function salvarModelo(modelo: ModeloGemini): Promise<void> {
  await ensureInit();

  const sessao = obterSessaoAtual();
  if (sessao) {
    await execute(
      'UPDATE usuarios SET gemini_modelo = ? WHERE id = ?',
      [modelo, sessao.id],
    );
    return;
  }

  // Modo legado: tabela configuracoes
  await execute(
    'INSERT INTO configuracoes (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor',
    ['gemini_modelo', modelo],
  );
}

// --- CRUD de ideias ---

export async function listarIdeias(opcoes?: {
  somenteFavoritas?: boolean;
  busca?: string;
}): Promise<Ideia[]> {
  await ensureInit();

  const sessao = obterSessaoAtual();
  const conditions: string[] = [];
  const args: unknown[] = [];

  if (sessao) {
    conditions.push('usuario_id = ?');
    args.push(sessao.id);
  }

  if (opcoes?.somenteFavoritas) {
    conditions.push('favorito = 1');
  }

  if (opcoes?.busca) {
    conditions.push('(titulo LIKE ? OR descricao LIKE ? OR tema LIKE ?)');
    const termo = `%${opcoes.busca}%`;
    args.push(termo, termo, termo);
  }

  let sql = 'SELECT * FROM ideias';
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY criado_em DESC';

  const rows = await query<Record<string, unknown>>(sql, args);
  return rows.map(rowToIdeia);
}

export async function salvarIdeia(ideia: NovaIdeiaInput): Promise<Ideia> {
  await ensureInit();

  const sessao = obterSessaoAtual();
  const criadoEm = ideia.criadoEm ?? new Date().toISOString();
  const favorito = ideia.favorito ? 1 : 0;

  // RETURNING * — last_insert_rowid() em HTTP stateless pode falhar entre chamadas
  const rows = await query<Record<string, unknown>>(
    `INSERT INTO ideias (titulo, descricao, tema, categoria, prompt_usado, favorito, criado_em${sessao ? ', usuario_id' : ''})
     VALUES (?, ?, ?, ?, ?, ?, ?${sessao ? ', ?' : ''})
     RETURNING *`,
    [
      ideia.titulo,
      ideia.descricao,
      ideia.tema,
      ideia.categoria,
      ideia.promptUsado ?? null,
      favorito,
      criadoEm,
      ...(sessao ? [sessao.id] : []),
    ],
  );

  if (rows.length === 0) {
    throw new Error('Falha ao recuperar ideia salva');
  }

  return rowToIdeia(rows[0]);
}

export async function excluirIdeia(id: number): Promise<void> {
  await ensureInit();

  const sessao = obterSessaoAtual();
  if (sessao) {
    await execute('DELETE FROM ideias WHERE id = ? AND usuario_id = ?', [id, sessao.id]);
  } else {
    await execute('DELETE FROM ideias WHERE id = ?', [id]);
  }
}

export async function alternarFavorito(id: number, favoritoAtual?: boolean): Promise<Ideia | undefined> {
  await ensureInit();

  const sessao = obterSessaoAtual();
  const novoValor = favoritoAtual ? 0 : 1;

  if (sessao) {
    await execute(
      'UPDATE ideias SET favorito = ? WHERE id = ? AND usuario_id = ?',
      [novoValor, id, sessao.id],
    );

    const rows = await query<Record<string, unknown>>(
      'SELECT * FROM ideias WHERE id = ? AND usuario_id = ?',
      [id, sessao.id],
    );

    if (rows.length === 0) return undefined;
    return rowToIdeia(rows[0]);
  }

  await execute(
    'UPDATE ideias SET favorito = ? WHERE id = ?',
    [novoValor, id],
  );

  const rows = await query<Record<string, unknown>>('SELECT * FROM ideias WHERE id = ?', [id]);

  if (rows.length === 0) return undefined;
  return rowToIdeia(rows[0]);
}
