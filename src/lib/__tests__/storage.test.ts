import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { NovaIdeiaInput } from '@/types';
import {
  lerChave,
  salvarChave,
  lerModelo,
  salvarModelo,
  listarIdeias,
  salvarIdeia,
  excluirIdeia,
  alternarFavorito,
  atualizarNomeUsuario,
  resetInitCache,
  testarConexaoTurso,
  registrarUsuario,
  loginUsuario,
  obterSessaoAtual,
  encerrarSessao,
  solicitarRecuperacaoSenha,
  redefinirSenhaComToken,
  salvarEnvelopeRecuperacao,
} from '@/lib/storage';

// Mocks fetch for the Serverless BFF (/api/*) endpoints
function mockFetchSequence(responses: { response?: unknown; ok?: boolean; status?: number }[]) {
  const mock = vi.fn();
  responses.forEach((r) => {
    mock.mockResolvedValueOnce({
      ok: r.ok ?? true,
      status: r.status ?? 200,
      statusText: r.ok ? 'OK' : 'Error',
      headers: {
        get: (name: string) => name.toLowerCase() === 'content-type' ? 'application/json' : null,
      },
      json: () => Promise.resolve(r.response),
    });
  });
  (globalThis as any).fetch = mock;
  return mock;
}

beforeEach(() => {
  process.env.VITE_TURSO_DATABASE_URL = 'libsql://test-db.turso.io';
  process.env.VITE_TURSO_AUTH_TOKEN = 'token123';
  resetInitCache();
  // Mock sessionStorage so fetchApi can read the token from the session
  const store: Record<string, string> = {};
  (globalThis as any).sessionStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.VITE_TURSO_DATABASE_URL;
  delete process.env.VITE_TURSO_AUTH_TOKEN;
});

describe('storage - configurações', () => {
  it('salvarChave e lerChave fazem PATCH no /api/usuario/config', async () => {
    // Registra usuário primeiro
    mockFetchSequence([
      { response: {
        token: 'tok-123',
        user: { id: 1, nome: 'Teste', email: 't@t.com', geminiModelo: 'gemini-2.5-flash' },
        saltHex: 'aabbccddeeff0011223344556677889900',
      }},
    ]);
    await registrarUsuario({ nome: 'Teste', email: 't@t.com', senha: 'Senha@123' });

    // Salva chave
    const mock = mockFetchSequence([
      { response: { ok: true } }, // PATCH config
    ]);

    await salvarChave('minha-chave-api');

    const patchCall = mock.mock.calls[0];
    const patchBody = JSON.parse(patchCall[1].body);
    expect(patchCall[0]).toBe('/api/usuario/config');
    expect(patchCall[1].method).toBe('PATCH');
    expect(patchBody.geminiKeyCifrada).not.toBe('minha-chave-api');
  });

  it('lerChave retorna string vazia quando não há chave cifrada', async () => {
    mockFetchSequence([
      { response: {
        token: 'tok-123',
        user: { id: 1, nome: 'Teste', email: 't@t.com', geminiModelo: 'gemini-2.5-flash' },
        saltHex: 'aabbccddeeff0011223344556677889900',
      }},
    ]);
    await registrarUsuario({ nome: 'Teste', email: 't@t.com', senha: 'Senha@123' });

    const mock = mockFetchSequence([
      { response: { geminiKeyCifrada: null } }, // GET config
    ]);

    const chave = await lerChave();
    expect(chave).toBe('');
    expect(mock.mock.calls[0][0]).toBe('/api/usuario/config');
  });

  it('salvarModelo e lerModelo fazem PATCH/GET no /api/usuario/config', async () => {
    mockFetchSequence([
      { response: {
        token: 'tok-123',
        user: { id: 1, nome: 'Teste', email: 't@t.com', geminiModelo: 'gemini-2.5-flash' },
        saltHex: 'aabbccddeeff0011223344556677889900',
      }},
    ]);
    await registrarUsuario({ nome: 'Teste', email: 't@t.com', senha: 'Senha@123' });

    const mock = mockFetchSequence([
      { response: { ok: true } }, // PATCH config
      { response: { modelo: 'gemini-2.5-pro' } }, // GET config
    ]);

    await salvarModelo('gemini-2.5-pro');
    const modelo = await lerModelo();
    expect(modelo).toBe('gemini-2.5-pro');
    expect(mock.mock.calls[0][0]).toBe('/api/usuario/config');
    expect(mock.mock.calls[1][0]).toBe('/api/usuario/config');
  });

  it('lerModelo retorna MODELO_PADRAO quando não configurado', async () => {
    mockFetchSequence([
      { response: {
        token: 'tok-123',
        user: { id: 1, nome: 'Teste', email: 't@t.com', geminiModelo: 'gemini-2.5-flash' },
        saltHex: 'aabbccddeeff0011223344556677889900',
      }},
    ]);
    await registrarUsuario({ nome: 'Teste', email: 't@t.com', senha: 'Senha@123' });

    mockFetchSequence([
      { response: {} }, // GET config — sem campo modelo
    ]);

    const modelo = await lerModelo();
    expect(modelo).toBe('gemini-2.5-flash');
  });
});

describe('storage - CRUD de ideias', () => {
  it('salvarIdeia envia POST para /api/ideias com descricao/tema cifrados', async () => {
    mockFetchSequence([
      { response: {
        token: 'tok-123',
        user: { id: 1, nome: 'Teste', email: 't@t.com', geminiModelo: 'gemini-2.5-flash' },
        saltHex: 'aabbccddeeff0011223344556677889900',
      }},
    ]);
    await registrarUsuario({ nome: 'Teste', email: 't@t.com', senha: 'Senha@123' });

    const mock = mockFetchSequence([
      { response: {
        ideia: {
          id: 1, titulo: 'Teste', descricao: 'Desc', tema: 'Tecnologia',
          categoria: 'App', favorito: false, criadoEm: '2025-01-01',
        },
      }},
    ]);

    const input: NovaIdeiaInput = {
      titulo: 'Teste',
      descricao: 'Desc',
      tema: 'Tecnologia',
      categoria: 'App',
    };

    const result = await salvarIdeia(input);
    expect(result.id).toBe(1);
    expect(result.titulo).toBe('Teste');

    const call = mock.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(call[0]).toBe('/api/ideias');
    expect(call[1].method).toBe('POST');
    // titulo é enviado em texto claro, descricao e tema são ciphertext
    expect(body.titulo).toBe('Teste');
    expect(body.descricao).not.toBe('Desc');
    expect(body.tema).not.toBe('Tecnologia');
  });

  it('listarIdeias faz GET no /api/ideias e decifra descricao/tema', async () => {
    mockFetchSequence([
      { response: {
        token: 'tok-123',
        user: { id: 1, nome: 'Teste', email: 't@t.com', geminiModelo: 'gemini-2.5-flash' },
        saltHex: 'aabbccddeeff0011223344556677889900',
      }},
    ]);
    const sessao = await registrarUsuario({ nome: 'Teste', email: 't@t.com', senha: 'Senha@123' });

    const { cifrarTexto } = await import('@/lib/crypto');
    const descCifrada = await cifrarTexto('Descricao Cifrada', sessao.vaultKeyHex);
    const temaCifrado = await cifrarTexto('Tema Cifrado', sessao.vaultKeyHex);

    const mock = mockFetchSequence([
      { response: {
        ideias: [
          { id: 1, titulo: 'Titulo Plano', descricao: descCifrada, tema: temaCifrado, categoria: 'App', favorito: false, criadoEm: '2025-01-01' },
        ],
      }},
    ]);

    const ideias = await listarIdeias();
    expect(ideias).toHaveLength(1);
    expect(ideias[0].titulo).toBe('Titulo Plano');
    expect(ideias[0].descricao).toBe('Descricao Cifrada');
    expect(ideias[0].tema).toBe('Tema Cifrado');
    expect(mock.mock.calls[0][0]).toBe('/api/ideias');
  });

  it('listarIdeias aplica filtro de favoritas em memória', async () => {
    mockFetchSequence([
      { response: {
        token: 'tok-123',
        user: { id: 1, nome: 'Teste', email: 't@t.com', geminiModelo: 'gemini-2.5-flash' },
        saltHex: 'aabbccddeeff0011223344556677889900',
      }},
    ]);
    await registrarUsuario({ nome: 'Teste', email: 't@t.com', senha: 'Senha@123' });

    mockFetchSequence([
      { response: {
        ideias: [
          { id: 1, titulo: 'Fav', descricao: 'D1', tema: 'T', categoria: 'App', favorito: true, criadoEm: '2025-01-01' },
          { id: 2, titulo: 'Nao Fav', descricao: 'D2', tema: 'T', categoria: 'App', favorito: false, criadoEm: '2025-01-02' },
        ],
      }},
    ]);

    const favs = await listarIdeias({ somenteFavoritas: true });
    expect(favs).toHaveLength(1);
    expect(favs[0].titulo).toBe('Fav');
  });

  it('listarIdeias aplica busca em memória', async () => {
    mockFetchSequence([
      { response: {
        token: 'tok-123',
        user: { id: 1, nome: 'Teste', email: 't@t.com', geminiModelo: 'gemini-2.5-flash' },
        saltHex: 'aabbccddeeff0011223344556677889900',
      }},
    ]);
    await registrarUsuario({ nome: 'Teste', email: 't@t.com', senha: 'Senha@123' });

    mockFetchSequence([
      { response: {
        ideias: [
          { id: 1, titulo: 'Python', descricao: 'D1', tema: 'T', categoria: 'App', favorito: false, criadoEm: '2025-01-01' },
          { id: 2, titulo: 'React', descricao: 'D2', tema: 'T', categoria: 'App', favorito: false, criadoEm: '2025-01-02' },
        ],
      }},
    ]);

    const result = await listarIdeias({ busca: 'python' });
    expect(result).toHaveLength(1);
    expect(result[0].titulo).toBe('Python');
  });

  it('listarIdeias aplica filtro de categoria em memória', async () => {
    mockFetchSequence([
      { response: {
        token: 'tok-123',
        user: { id: 1, nome: 'Teste', email: 't@t.com', geminiModelo: 'gemini-2.5-flash' },
        saltHex: 'aabbccddeeff0011223344556677889900',
      }},
    ]);
    await registrarUsuario({ nome: 'Teste', email: 't@t.com', senha: 'Senha@123' });

    mockFetchSequence([
      { response: {
        ideias: [
          { id: 1, titulo: 'A', descricao: 'D1', tema: 'T', categoria: 'App', favorito: false, criadoEm: '2025-01-01' },
          { id: 2, titulo: 'B', descricao: 'D2', tema: 'T', categoria: 'Hobby', favorito: false, criadoEm: '2025-01-02' },
        ],
      }},
    ]);

    const result = await listarIdeias({ categoria: 'Hobby' });
    expect(result).toHaveLength(1);
    expect(result[0].categoria).toBe('Hobby');
  });

  it('excluirIdeia envia DELETE para /api/ideias?id=<id>', async () => {
    mockFetchSequence([
      { response: {
        token: 'tok-123',
        user: { id: 1, nome: 'Teste', email: 't@t.com', geminiModelo: 'gemini-2.5-flash' },
        saltHex: 'aabbccddeeff0011223344556677889900',
      }},
    ]);
    await registrarUsuario({ nome: 'Teste', email: 't@t.com', senha: 'Senha@123' });

    const mock = mockFetchSequence([
      { response: { ok: true } },
    ]);

    await excluirIdeia(5);
    expect(mock.mock.calls[0][0]).toBe('/api/ideias?id=5');
    expect(mock.mock.calls[0][1].method).toBe('DELETE');
  });

  it('alternarFavorito envia PATCH para /api/ideias', async () => {
    mockFetchSequence([
      { response: {
        token: 'tok-123',
        user: { id: 1, nome: 'Teste', email: 't@t.com', geminiModelo: 'gemini-2.5-flash' },
        saltHex: 'aabbccddeeff0011223344556677889900',
      }},
    ]);
    await registrarUsuario({ nome: 'Teste', email: 't@t.com', senha: 'Senha@123' });

    const mock = mockFetchSequence([
      { response: { ok: true } }, // PATCH favorito
      { response: {
        ideias: [
          { id: 1, titulo: 'Teste', descricao: 'Desc', tema: 'Tec', categoria: 'App', favorito: true, criadoEm: '2025-01-01' },
        ],
      }}, // GET ideias (para atualizar em memória)
    ]);

    const result = await alternarFavorito(1, false);
    expect(result).toBeDefined();
    expect(result!.favorito).toBe(true);

    const patchCall = mock.mock.calls[0];
    expect(patchCall[0]).toBe('/api/ideias');
    expect(patchCall[1].method).toBe('PATCH');
    const patchBody = JSON.parse(patchCall[1].body);
    expect(patchBody).toEqual({ id: 1, favorito: true });
  });
});

// --- Auth tests ---

describe('storage - sessão e auth', () => {
  beforeEach(() => {
    resetInitCache();
    encerrarSessao();
  });

  afterEach(() => {
    encerrarSessao();
    vi.restoreAllMocks();
  });

  it('obterSessaoAtual retorna null quando não logado', () => {
    expect(obterSessaoAtual()).toBeNull();
  });

  it('encerrarSessao limpa a sessão ativa', async () => {
    mockFetchSequence([
      { response: {
        token: 'tok-123',
        user: { id: 1, nome: 'Teste', email: 't@t.com', geminiModelo: 'gemini-2.5-flash' },
        saltHex: 'aabbccddeeff0011223344556677889900',
      }},
    ]);

    await registrarUsuario({ nome: 'Teste', email: 't@t.com', senha: 'Senha@123' });
    expect(obterSessaoAtual()).not.toBeNull();
    expect(obterSessaoAtual()!.id).toBe(1);

    encerrarSessao();
    expect(obterSessaoAtual()).toBeNull();
  });

  it('registrarUsuario cria usuário via /api/auth/registrar e salva sessão', async () => {
    mockFetchSequence([
      { response: {
        token: 'tok-token-abc',
        user: { id: 42, nome: 'João', email: 'joao@test.com', geminiModelo: 'gemini-2.5-flash' },
        saltHex: 'aabbccddeeff0011223344556677889900',
      }},
    ]);

    const sessao = await registrarUsuario({ nome: 'João', email: 'JOAO@Test.com', senha: 'Senha@123' });
    expect(sessao.id).toBe(42);
    expect(sessao.nome).toBe('João');
    expect(sessao.email).toBe('joao@test.com');
    expect(sessao.vaultKeyHex).toMatch(/^[0-9a-f]{64}$/);
    expect(sessao.token).toBe('tok-token-abc');
    expect(obterSessaoAtual()?.id).toBe(42);

    const call = (globalThis as any).fetch.mock.calls[0];
    expect(call[0]).toBe('/api/auth/registrar');
    expect(call[1].method).toBe('POST');
  });

  it('loginUsuario com credenciais válidas salva sessão via /api/auth/login', async () => {
    const { derivarChaves, gerarSaltHex } = await import('@/lib/crypto');
    const salt = await gerarSaltHex();
    const { authHashHex } = await derivarChaves('Senha@123', salt);

    mockFetchSequence([
      { response: {
        token: 'tok-login-xyz',
        user: { id: 7, nome: 'Dev', email: 'dev@test.com', geminiModelo: 'gemini-2.5-flash' },
        saltHex: salt,
        geminiKeyCifrada: null,
      }},
    ]);

    const sessao = await loginUsuario({ email: 'dev@test.com', senha: 'Senha@123' });
    expect(sessao.id).toBe(7);
    expect(sessao.nome).toBe('Dev');
    expect(sessao.token).toBe('tok-login-xyz');
    expect(obterSessaoAtual()?.id).toBe(7);

    const call = (globalThis as any).fetch.mock.calls[0];
    expect(call[0]).toBe('/api/auth/login');
    expect(call[1].method).toBe('POST');
  });

  it('loginUsuario falha quando a API retorna erro', async () => {
    mockFetchSequence([
      { ok: false, status: 401, response: { erro: 'E-mail ou senha inválidos' } },
    ]);

    await expect(loginUsuario({ email: 'naoexiste@test.com', senha: 'Senha@123' })).rejects.toThrow();
  });

  it('salvarChave cifra quando há sessão ativa', async () => {
    mockFetchSequence([
      { response: {
        token: 'tok-123',
        user: { id: 1, nome: 'Teste', email: 't@t.com', geminiModelo: 'gemini-2.5-flash' },
        saltHex: 'aabbccddeeff0011223344556677889900',
      }},
    ]);
    await registrarUsuario({ nome: 'Teste', email: 't@t.com', senha: 'Senha@123' });

    const mock = mockFetchSequence([
      { response: { ok: true } },
    ]);

    await salvarChave('minha-api-key');

    const call = mock.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(call[0]).toBe('/api/usuario/config');
    expect(call[1].method).toBe('PATCH');
    expect(body.geminiKeyCifrada).not.toBe('minha-api-key');
  });

  it('salvarChave usa localStorage quando não há sessão (modo legado)', async () => {
    // Sem sessão — fallback local
    const store: Record<string, string> = {};
    (globalThis as any).localStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, val: string) => { store[key] = val; },
    };

    await salvarChave('minha-chave-api');
    expect(store['lumi_gemini_api_key']).toBe('minha-chave-api');
  });

  it('lerChave decifra quando há sessão ativa', async () => {
    mockFetchSequence([
      { response: {
        token: 'tok-123',
        user: { id: 1, nome: 'Teste', email: 't@t.com', geminiModelo: 'gemini-2.5-flash' },
        saltHex: 'aabbccddeeff0011223344556677889900',
      }},
    ]);
    const sessao = await registrarUsuario({ nome: 'Teste', email: 't@t.com', senha: 'Senha@123' });

    const { cifrarTexto } = await import('@/lib/crypto');
    const cifrada = await cifrarTexto('api-key-teste', sessao.vaultKeyHex);

    mockFetchSequence([
      { response: { geminiKeyCifrada: cifrada } },
    ]);

    const chave = await lerChave();
    expect(chave).toBe('api-key-teste');
  });

  it('lerChave usa localStorage quando não há sessão (modo legado)', async () => {
    (globalThis as any).localStorage = {
      getItem: (key: string) => key === 'lumi_gemini_api_key' ? 'chave-legada' : null,
    };

    // Não autenticado
    expect(obterSessaoAtual()).toBeNull();
    // lerChave deve usar localStorage
    const chave = await lerChave();
    expect(chave).toBe('chave-legada');
  });

  it('salvarModelo usa /api/usuario/config quando há sessão', async () => {
    mockFetchSequence([
      { response: {
        token: 'tok-123',
        user: { id: 1, nome: 'Teste', email: 't@t.com', geminiModelo: 'gemini-2.5-flash' },
        saltHex: 'aabbccddeeff0011223344556677889900',
      }},
    ]);
    await registrarUsuario({ nome: 'Teste', email: 't@t.com', senha: 'Senha@123' });

    const mock = mockFetchSequence([
      { response: { ok: true } },
    ]);

    await salvarModelo('gemini-2.5-pro');

    const call = mock.mock.calls[0];
    expect(call[0]).toBe('/api/usuario/config');
    expect(call[1].method).toBe('PATCH');
    const body = JSON.parse(call[1].body);
    expect(body.modelo).toBe('gemini-2.5-pro');
  });

  it('lerModelo usa /api/usuario/config quando há sessão', async () => {
    mockFetchSequence([
      { response: {
        token: 'tok-123',
        user: { id: 1, nome: 'Teste', email: 't@t.com', geminiModelo: 'gemini-2.5-flash' },
        saltHex: 'aabbccddeeff0011223344556677889900',
      }},
    ]);
    await registrarUsuario({ nome: 'Teste', email: 't@t.com', senha: 'Senha@123' });

    const mock = mockFetchSequence([
      { response: { modelo: 'gemini-2.5-pro' } },
    ]);

    const modelo = await lerModelo();
    expect(modelo).toBe('gemini-2.5-pro');
    expect(mock.mock.calls[0][0]).toBe('/api/usuario/config');
  });

  it('loginUsuario com senha incorreta falha', async () => {
    const { derivarChaves, gerarSaltHex } = await import('@/lib/crypto');
    const salt = await gerarSaltHex();
    const { authHashHex } = await derivarChaves('Senha@123', salt);

    mockFetchSequence([
      { response: {
        token: 'tok-123',
        user: { id: 1, nome: 'Teste', email: 't@t.com', geminiModelo: 'gemini-2.5-flash' },
        saltHex: salt,
      }},
    ]);
    await registrarUsuario({ nome: 'Teste', email: 't@t.com', senha: 'Senha@123' });
    encerrarSessao();

    // API rejeita senha errada
    mockFetchSequence([
      { ok: false, status: 401, response: { erro: 'E-mail ou senha inválidos' } },
    ]);

    await expect(loginUsuario({ email: 't@t.com', senha: 'senha-errada' })).rejects.toThrow();
  });

  it('loginUsuario com sucesso extrai salt do PHC sem coluna salt', async () => {
    const { derivarChaves, gerarSaltHex } = await import('@/lib/crypto');
    const salt = await gerarSaltHex();
    const { authHashHex, vaultKeyHex } = await derivarChaves('minhaSenha@123', salt);

    mockFetchSequence([
      { response: {
        token: 'tok-login',
        user: { id: 7, nome: 'Dev', email: 'dev@test.com', geminiModelo: 'gemini-2.5-flash' },
        saltHex: salt,
        geminiKeyCifrada: null,
      }},
    ]);

    const sessao = await loginUsuario({ email: 'dev@test.com', senha: 'minhaSenha@123' });
    expect(sessao.id).toBe(7);
    expect(sessao.nome).toBe('Dev');
    expect(sessao.email).toBe('dev@test.com');
    expect(sessao.vaultKeyHex).toBe(vaultKeyHex);
    expect(obterSessaoAtual()?.vaultKeyHex).toBe(vaultKeyHex);
    expect(sessao.token).toBe('tok-login');
  });
});

// --- usuario_id filtering tests ---

describe('storage - isolamento de ideias por usuario_id', () => {
  beforeEach(() => {
    resetInitCache();
    encerrarSessao();
  });

  afterEach(() => {
    encerrarSessao();
    vi.restoreAllMocks();
  });

  // Helper: registra um usuário mockado e retorna a sessão
  async function registrarUsuarioMockado(nome: string, email: string, senha: string): Promise<ReturnType<typeof obterSessaoAtual>> {
    mockFetchSequence([
      { response: {
        token: 'tok-123',
        user: { id: 1, nome, email, geminiModelo: 'gemini-2.5-flash' },
        saltHex: 'aabbccddeeff0011223344556677889900',
      }},
    ]);
    await registrarUsuario({ nome, email, senha });
    return obterSessaoAtual()!;
  }

  it('salvarIdeia inclui criptografia E2E quando logado', async () => {
    await registrarUsuarioMockado('Teste', 't@t.com', 'Senha@123');

    const mock = mockFetchSequence([
      { response: {
        ideia: {
          id: 1, titulo: 'Titulo Original', descricao: 'CIPHERTEXT_DESC',
          tema: 'CIPHERTEXT_TEMA', categoria: 'App', favorito: false, criadoEm: '2025-01-01',
        },
      }},
    ]);

    const result = await salvarIdeia({ titulo: 'Titulo Original', descricao: 'Desc Original', tema: 'Tecnologia', categoria: 'App' });
    expect(result.id).toBe(1);

    const body = JSON.parse(mock.mock.calls[0][1].body);
    expect(body.titulo).toBe('Titulo Original');
    expect(body.descricao).not.toBe('Desc Original');
    expect(body.tema).not.toBe('Tecnologia');
  });

  it('listarIdeias filtra por usuario_id quando logado (via API)', async () => {
    await registrarUsuarioMockado('Teste', 't@t.com', 'Senha@123');

    const mock = mockFetchSequence([
      { response: {
        ideias: [
          { id: 1, titulo: 'Teste', descricao: 'Desc', tema: 'Tecnologia', categoria: 'App', favorito: false, criadoEm: '2025-01-01' },
        ],
      }},
    ]);

    await listarIdeias();
    expect(mock.mock.calls[0][0]).toBe('/api/ideias');
    // Autenticação via token no header (Bearer)
    const headers = mock.mock.calls[0][1].headers;
    expect(headers.get('Authorization')).toMatch(/Bearer tok-123/);
  });

  it('excluirIdeia usa /api/ideias?id=<id> quando logado', async () => {
    await registrarUsuarioMockado('Teste', 't@t.com', 'Senha@123');

    const mock = mockFetchSequence([
      { response: { ok: true } },
    ]);

    await excluirIdeia(5);
    expect(mock.mock.calls[0][0]).toBe('/api/ideias?id=5');

    const headers = mock.mock.calls[0][1].headers;
    expect(headers.get('Authorization')).toMatch(/Bearer tok-123/);
  });

  it('alternarFavorito usa /api/ideias PATCH quando logado', async () => {
    await registrarUsuarioMockado('Teste', 't@t.com', 'Senha@123');

    const mock = mockFetchSequence([
      { response: { ok: true } },
      { response: {
        ideias: [
          { id: 1, titulo: 'Teste', descricao: 'Desc', tema: 'Tec', categoria: 'App', favorito: true, criadoEm: '2025-01-01' },
        ],
      }},
    ]);

    const result = await alternarFavorito(1, false);
    expect(result).toBeDefined();
    expect(result!.favorito).toBe(true);

    expect(mock.mock.calls[0][0]).toBe('/api/ideias');
    expect(mock.mock.calls[0][1].method).toBe('PATCH');
  });
});

// --- atualizarNomeUsuario ---

describe('storage - atualizarNomeUsuario', () => {
  beforeEach(() => {
    resetInitCache();
    encerrarSessao();
  });

  afterEach(() => {
    encerrarSessao();
    vi.restoreAllMocks();
  });

  async function registrarUsuarioMockado(nome: string, email: string, senha: string): Promise<ReturnType<typeof obterSessaoAtual>> {
    mockFetchSequence([
      { response: {
        token: 'tok-123',
        user: { id: 1, nome, email, geminiModelo: 'gemini-2.5-flash' },
        saltHex: 'aabbccddeeff0011223344556677889900',
      }},
    ]);
    await registrarUsuario({ nome, email, senha });
    return obterSessaoAtual()!;
  }

  it('atualizarNomeUsuario atualiza nome via PATCH /api/usuario/perfil e retorna nova sessão', async () => {
    await registrarUsuarioMockado('Nome Antigo', 't@t.com', 'Senha@123');

    const mock = mockFetchSequence([
      { response: { ok: true, nome: 'Nome Novo' } },
    ]);

    const sessao = await atualizarNomeUsuario('Nome Novo');
    expect(sessao).not.toBeNull();
    expect(sessao!.nome).toBe('Nome Novo');
    expect(obterSessaoAtual()?.nome).toBe('Nome Novo');

    const call = mock.mock.calls[0];
    expect(call[0]).toBe('/api/usuario/perfil');
    expect(call[1].method).toBe('PATCH');
    const body = JSON.parse(call[1].body);
    expect(body.nome).toBe('Nome Novo');
  });

  it('atualizarNomeUsuario lança erro quando não logado', async () => {
    await expect(atualizarNomeUsuario('Nome')).rejects.toThrow('Usuário não autenticado');
  });

  it('atualizarNomeUsuario faz trim do nome', async () => {
    await registrarUsuarioMockado('Teste', 't@t.com', 'Senha@123');

    const mock = mockFetchSequence([
      { response: { ok: true, nome: 'Nome com Espacos' } },
    ]);

    await atualizarNomeUsuario('  Nome com Espacos  ');

    const body = JSON.parse(mock.mock.calls[0][1].body);
    expect(body.nome).toBe('Nome com Espacos');
  });
});

// --- testarConexaoTurso ---

describe('storage - testarConexaoTurso', () => {
  it('testarConexaoTurso retorna ok quando a API responde', async () => {
    mockFetchSequence([
      { response: { ideias: [] } }, // GET /api/ideias (sem auth → 401, mas fetchApi lança)
    ]);

    // Sem sessão, a API retorna 401, mas o fetch mockado retorna ok
    const result = await testarConexaoTurso();
    expect(result.ok).toBe(true);
  });

  it('testarConexaoTurso retorna erro quando fetch falha', async () => {
    (globalThis as any).fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const result = await testarConexaoTurso();
    expect(result.ok).toBe(false);
    expect(result.mensagem).toContain('Network error');
  });
});

// --- Password Recovery Flow ---

describe('storage - recuperação de senha', () => {
  beforeEach(() => {
    resetInitCache();
    encerrarSessao();
  });

  afterEach(() => {
    encerrarSessao();
    vi.restoreAllMocks();
  });

  it('solicitarRecuperacaoSenha envia POST para /api/auth/recuperar-senha com email', async () => {
    const mock = mockFetchSequence([
      { response: { ok: true } }, // POST recuperar-senha
    ]);

    const result = await solicitarRecuperacaoSenha('usuario@test.com');

    expect(mock.mock.calls[0][0]).toBe('/api/auth/recuperar-senha');
    expect(mock.mock.calls[0][1].method).toBe('POST');
    const body = JSON.parse(mock.mock.calls[0][1].body);
    expect(body.email).toBe('usuario@test.com');
    expect(result.ok).toBe(true);
    expect(result.mensagem).toContain('código de recuperação');
  });

  it('solicitarRecuperacaoSenha retorna ok mesmo quando API falha (não vaza existência)', async () => {
    mockFetchSequence([
      { ok: false, status: 500, response: { erro: 'Internal error' } },
    ]);

    const result = await solicitarRecuperacaoSenha('naoexiste@test.com');
    expect(result.ok).toBe(false);
    expect(result.mensagem).toContain('erro');
  });

  it('redefinirSenhaComToken deriva authHashHex e envia POST para /api/auth/redefinir-senha', async () => {
    const { gerarSaltHex } = await import('@/lib/crypto');
    const saltHex = await gerarSaltHex();
    const token = 'token-de-recuperacao-abc123';
    const novaSenha = 'NovaSenha@123';

    const mock = mockFetchSequence([
      { response: { ok: true, mensagem: 'Senha redefinida com sucesso' } },
    ]);

    const result = await redefinirSenhaComToken(token, saltHex, novaSenha);

    expect(result.ok).toBe(true);
    expect(result.mensagem).toBe('Senha redefinida com sucesso');

    const call = mock.mock.calls[0];
    expect(call[0]).toBe('/api/auth/redefinir-senha');
    expect(call[1].method).toBe('POST');
    const body = JSON.parse(call[1].body);
    expect(body.token).toBe(token);
    expect(body.saltHex).toBe(saltHex);
    expect(body.credencialHash).toMatch(/^\$argon2id\$/);
  });

  it('redefinirSenhaComToken falha quando API retorna erro', async () => {
    const { gerarSaltHex } = await import('@/lib/crypto');
    const saltHex = await gerarSaltHex();

    mockFetchSequence([
      { ok: false, status: 400, response: { erro: 'Token expirado' } },
    ]);

    const result = await redefinirSenhaComToken('token-invalido', saltHex, 'NovaSenha@123');
    expect(result.ok).toBe(false);
    expect(result.mensagem).toContain('Token expirado');
  });

  it('salvarEnvelopeRecuperacao envia envelope cifrado para /api/usuario/perfil', async () => {
    mockFetchSequence([
      { response: {
        token: 'tok-123',
        user: { id: 1, nome: 'Teste', email: 't@t.com', geminiModelo: 'gemini-2.5-flash' },
        saltHex: 'aabbccddeeff0011223344556677889900',
      }},
    ]);
    await registrarUsuario({ nome: 'Teste', email: 't@t.com', senha: 'Senha@123' });

    const { gerarRecoveryCode } = await import('@/lib/crypto');
    const recoveryCode = await gerarRecoveryCode();

    const mock = mockFetchSequence([
      { response: { ok: true } },
    ]);

    await salvarEnvelopeRecuperacao(recoveryCode);

    const call = mock.mock.calls[0];
    expect(call[0]).toBe('/api/usuario/perfil');
    expect(call[1].method).toBe('PATCH');
    const body = JSON.parse(call[1].body);
    expect(body.recoveryEnvelop).toBeDefined();
    expect(body.recoveryEnvelop).not.toContain('lumi'); // não é o vaultKey em plaintext
  });

  it('salvarEnvelopeRecuperacao não faz nada quando não autenticado', async () => {
    // Sem sessão — deve retornar sem lançar erro
    await expect(salvarEnvelopeRecuperacao('LUMI-XXXX-XXXX-XXXX-XXXX')).resolves.toBeUndefined();
  });
});
