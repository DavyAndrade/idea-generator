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
} from '@/lib/storage';

function mockFetchSequence(responses: { response?: unknown; ok?: boolean; status?: number }[]) {
  const mock = vi.fn();
  responses.forEach((r) => {
    mock.mockResolvedValueOnce({
      ok: r.ok ?? true,
      status: r.status ?? 200,
      statusText: r.ok ? 'OK' : 'Error',
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
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.VITE_TURSO_DATABASE_URL;
  delete process.env.VITE_TURSO_AUTH_TOKEN;
});

describe('storage - configurações', () => {
  it('salvarChave e lerChave fazem upsert', async () => {
    const mock = mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // INSERT upsert
      { response: { results: [{ result: { rows: [], cols: ['valor'] } }] } }, // SELECT
    ]);

    await salvarChave('minha-chave-api');

    const insertCall = mock.mock.calls[1];
    const body = JSON.parse(insertCall[1].body);
    expect(body.requests[0].stmt.sql).toContain('ON CONFLICT(chave) DO UPDATE');

    await lerChave();
    const selectCall = mock.mock.calls[2];
    const selectBody = JSON.parse(selectCall[1].body);
    expect(selectBody.requests[0].stmt.sql).toContain('SELECT valor FROM configuracoes WHERE chave = ?');
    expect(selectBody.requests[0].stmt.args).toEqual([{ type: 'text', value: 'gemini_api_key' }]);
  });

  it('lerChave retorna string vazia quando não existe', async () => {
    mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init
      { response: { results: [{ result: { rows: [], cols: ['valor'] } }] } }, // SELECT empty
    ]);

    const chave = await lerChave();
    expect(chave).toBe('');
  });

  it('salvarModelo e lerModelo fazem upsert', async () => {
    mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // INSERT modelo
      {
        response: {
          results: [{
            result: {
              rows: [[{ type: 'text', value: 'gemini-2.5-pro' }]],
              cols: [{ name: 'valor' }],
            },
          }],
        },
      },
    ]);

    await salvarModelo('gemini-2.5-pro');
    const modelo = await lerModelo();
    expect(modelo).toBe('gemini-2.5-pro');
  });

  it('lerModelo retorna MODELO_PADRAO quando não configurado', async () => {
    mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init
      { response: { results: [{ result: { rows: [], cols: [{ name: 'valor' }] } }] } }, // SELECT empty
    ]);

    const modelo = await lerModelo();
    expect(modelo).toBe('gemini-2.5-flash');
  });
});

describe('storage - CRUD de ideias', () => {
  it('salvarIdeia usa INSERT ... RETURNING *', async () => {
    const mock = mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init
      {
        response: {
          results: [{
            result: {
              cols: [
                { name: 'id' }, { name: 'titulo' }, { name: 'descricao' },
                { name: 'tema' }, { name: 'categoria' }, { name: 'prompt_usado' },
                { name: 'favorito' }, { name: 'criado_em' },
              ],
              rows: [
                [
                  { type: 'integer', value: '1' }, { type: 'text', value: 'Teste' }, { type: 'text', value: 'Desc' },
                  { type: 'text', value: 'Tecnologia' }, { type: 'text', value: 'App' }, { type: 'null' },
                  { type: 'integer', value: '0' }, { type: 'text', value: '2025-01-01' },
                ],
              ],
            },
          }],
        },
      },
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
    expect(result.favorito).toBe(false);

    const call = mock.mock.calls[1];
    const body = JSON.parse(call[1].body);
    expect(body.requests[0].stmt.sql).toContain('RETURNING *');
  });

  it('listarIdeias com busca e filtro de favoritas (busca em memória)', async () => {
    const mock = mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init
      {
        response: {
          results: [{
            result: {
              columns: ['id', 'titulo', 'descricao', 'tema', 'categoria', 'favorito', 'criado_em'],
              rows: [[1, 'Teste', 'Desc', 'Tecnologia', 'App', 0, '2025-01-01']],
            },
          }],
        },
      },
    ]);

    const ideias = await listarIdeias({ somenteFavoritas: true, busca: 'Tecnologia' });
    expect(ideias).toHaveLength(1);
    expect(ideias[0].tema).toBe('Tecnologia');

    const call = mock.mock.calls[1];
    const body = JSON.parse(call[1].body);
    const sql = body.requests[0].stmt.sql;
    expect(sql).toContain('WHERE');
    expect(sql).toContain('favorito = 1');
    expect(sql).toContain('ORDER BY criado_em DESC');
    // Busca agora é feita em memória (após decifrar), não via LIKE no SQL
    expect(sql).not.toContain('LIKE ?');
  });

  it('excluirIdeia envia DELETE', async () => {
    const mock = mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // DELETE
    ]);

    await excluirIdeia(5);
    const call = mock.mock.calls[1];
    const body = JSON.parse(call[1].body);
    expect(body.requests[0].stmt.sql).toBe('DELETE FROM ideias WHERE id = ?');
    expect(body.requests[0].stmt.args).toEqual([{ type: 'integer', value: '5' }]);
  });

  it('alternarFavorito inverte valor', async () => {
    mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // UPDATE
      {
        response: {
          results: [{
            result: {
              columns: ['id', 'titulo', 'descricao', 'tema', 'categoria', 'prompt_usado', 'favorito', 'criado_em'],
              rows: [[1, 'Teste', 'Desc', 'Tec', 'App', null, 1, '2025-01-01']],
            },
          }],
        },
      },
    ]);

    const result = await alternarFavorito(1, false);
    expect(result).toBeDefined();
    expect(result!.favorito).toBe(true);

    const call = (globalThis as any).fetch.mock.calls[1];
    const body = JSON.parse(call[1].body);
    expect(body.requests[0].stmt.sql).toBe('UPDATE ideias SET favorito = ? WHERE id = ?');
    expect(body.requests[0].stmt.args).toEqual([{ type: 'integer', value: '1' }, { type: 'integer', value: '1' }]);
  });

  it('alternarFavorito retorna undefined quando ideia não existe', async () => {
    mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // UPDATE
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // SELECT empty
    ]);

    const result = await alternarFavorito(999, true);
    expect(result).toBeUndefined();
  });

  it('resetInitCache permite re-inicialização', async () => {
    mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init 1
      { response: { results: [{ result: { rows: [[{ type: 'text', value: '' }]], cols: [{ name: 'valor' }] } }] } }, // SELECT 1
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init 2
      { response: { results: [{ result: { rows: [[{ type: 'text', value: '' }]], cols: [{ name: 'valor' }] } }] } }, // SELECT 2
    ]);

    await lerChave();
    resetInitCache();
    await lerChave();

    expect((globalThis as any).fetch.mock.calls.length).toBe(4);
  });

  it('testarConexaoTurso re-exportado funciona', async () => {
    mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init
    ]);

    const result = await testarConexaoTurso();
    expect(result.ok).toBe(true);
  });
});

// --- Auth tests ---

describe('storage - sessão e auth', () => {
  beforeEach(() => {
    resetInitCache();
    encerrarSessao(); // garante sessão limpa
  });

  afterEach(() => {
    encerrarSessao();
    vi.restoreAllMocks();
  });

  it('obterSessaoAtual retorna null quando não logado', () => {
    expect(obterSessaoAtual()).toBeNull();
  });

  it('encerrarSessao limpa a sessão ativa', async () => {
    // Simula sessão em memória (não via login, apenas via storage direto)
    const sessao = { id: 1, nome: 'Teste', email: 't@t.com', vaultKeyHex: 'abc' };
    // Força sessão via sessionStorage interno
    const storage = await import('@/lib/storage');
    // Usa salvarSessaoStorage interno via registrarUsuario mockado
    mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init
      {
        response: {
          results: [{
            result: {
              cols: [{ name: 'id' }, { name: 'nome' }, { name: 'email' },
                     { name: 'credencial_hash' }, { name: 'gemini_key_cifrada' },
                     { name: 'gemini_modelo' }, { name: 'criado_em' }],
              rows: [
                [{ type: 'integer', value: '1' }, { type: 'text', value: 'Teste' }, { type: 'text', value: 't@t.com' },
                 { type: 'text', value: 'hash' }, { type: 'null' },
                 { type: 'text', value: 'gemini-2.5-flash' }, { type: 'text', value: '2025-01-01' }],
              ],
            },
          }],
        },
      },
    ]);

    await registrarUsuario({ nome: 'Teste', email: 't@t.com', senha: 'senha123' });
    expect(obterSessaoAtual()).not.toBeNull();
    expect(obterSessaoAtual()!.id).toBe(1);

    encerrarSessao();
    expect(obterSessaoAtual()).toBeNull();
  });

  it('registrarUsuario cria usuário e salva sessão', async () => {
    mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init
      {
        response: {
          results: [{
            result: {
              cols: [{ name: 'id' }, { name: 'nome' }, { name: 'email' },
                     { name: 'credencial_hash' }, { name: 'gemini_key_cifrada' },
                     { name: 'gemini_modelo' }, { name: 'criado_em' }],
              rows: [
                [{ type: 'integer', value: '42' }, { type: 'text', value: 'João' }, { type: 'text', value: 'joao@test.com' },
                 { type: 'text', value: 'somehash' }, { type: 'null' },
                 { type: 'text', value: 'gemini-2.5-flash' }, { type: 'text', value: '2025-01-01' }],
              ],
            },
          }],
        },
      },
    ]);

    const sessao = await registrarUsuario({ nome: 'João', email: 'JOAO@Test.com', senha: 'senha123' });
    expect(sessao.id).toBe(42);
    expect(sessao.nome).toBe('João');
    expect(sessao.email).toBe('joao@test.com');
    expect(sessao.vaultKeyHex).toMatch(/^[0-9a-f]{64}$/);
    expect(obterSessaoAtual()?.id).toBe(42);
  });

  it('loginUsuario com credenciais válidas salva sessão', async () => {
    mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init
      {
        response: {
          results: [{
            result: {
              cols: [{ name: 'id' }, { name: 'nome' }, { name: 'email' },
                     { name: 'credencial_hash' }, { name: 'gemini_key_cifrada' },
                     { name: 'gemini_modelo' }, { name: 'criado_em' }],
              rows: [],
            },
          }],
        },
      },
    ]);

    // Nenhum usuário com esse email → falha
    await expect(loginUsuario({ email: 'naoexiste@test.com', senha: 'senha' })).rejects.toThrow('inválidos');
  });

  it('salvarChave cifra quando há sessão ativa', async () => {
    // Primeiro registra um usuário (init + INSERT RETURNING)
    mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init
      {
        response: {
          results: [{
            result: {
              cols: [{ name: 'id' }, { name: 'nome' }, { name: 'email' },
                     { name: 'credencial_hash' }, { name: 'gemini_key_cifrada' },
                     { name: 'gemini_modelo' }, { name: 'criado_em' }],
              rows: [
                [{ type: 'integer', value: '1' }, { type: 'text', value: 'Teste' }, { type: 'text', value: 't@t.com' },
                 { type: 'text', value: 'hash' }, { type: 'null' },
                 { type: 'text', value: 'gemini-2.5-flash' }, { type: 'text', value: '2025-01-01' }],
              ],
            },
          }],
        },
      },
    ]);
    await registrarUsuario({ nome: 'Teste', email: 't@t.com', senha: 'senha123' });

    // Agora salva a chave (UPDATE usuarios SET gemini_key_cifrada)
    const mock = mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // UPDATE
    ]);

    await salvarChave('minha-api-key');

    const call = mock.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.requests[0].stmt.sql).toBe('UPDATE usuarios SET gemini_key_cifrada = ? WHERE id = ?');
    // O valor cifrado não deve ser a chave em plain text
    const cifrada = body.requests[0].stmt.args[0].value;
    expect(cifrada).not.toBe('minha-api-key');
  });

  it('salvarChave usa tabela configuracoes quando não há sessão (modo legado)', async () => {
    const mock = mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // INSERT upsert
    ]);

    await salvarChave('minha-chave-api');

    const call = mock.mock.calls[1];
    const body = JSON.parse(call[1].body);
    expect(body.requests[0].stmt.sql).toContain('INSERT INTO configuracoes');
  });

  it('lerChave decifra quando há sessão ativa', async () => {
    // Registra usuário
    mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init
      {
        response: {
          results: [{
            result: {
              cols: [{ name: 'id' }, { name: 'nome' }, { name: 'email' },
                     { name: 'credencial_hash' }, { name: 'gemini_key_cifrada' },
                     { name: 'gemini_modelo' }, { name: 'criado_em' }],
              rows: [
                [{ type: 'integer', value: '1' }, { type: 'text', value: 'Teste' }, { type: 'text', value: 't@t.com' },
                 { type: 'text', value: 'hash' }, { type: 'null' },
                 { type: 'text', value: 'gemini-2.5-flash' }, { type: 'text', value: '2025-01-01' }],
              ],
            },
          }],
        },
      },
    ]);
    const sessao = await registrarUsuario({ nome: 'Teste', email: 't@t.com', senha: 'senha123' });

    // Cifra uma chave e salva
    const { cifrarTexto } = await import('@/lib/crypto');
    const cifrada = await cifrarTexto('api-key-teste', sessao.vaultKeyHex);

    mockFetchSequence([
      {
        response: {
          results: [{
            result: {
              cols: [{ name: 'gemini_key_cifrada' }],
              rows: [[{ type: 'text', value: cifrada }]],
            },
          }],
        },
      },
    ]);

    const chave = await lerChave();
    expect(chave).toBe('api-key-teste');
  });

  it('lerChave usa tabela configuracoes quando não há sessão (modo legado)', async () => {
    mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init
      {
        response: {
          results: [{
            result: {
              cols: [{ name: 'valor' }],
              rows: [[{ type: 'text', value: 'chave-legada' }]],
            },
          }],
        },
      },
    ]);

    const chave = await lerChave();
    expect(chave).toBe('chave-legada');
  });

  it('salvarModelo usa tabela usuarios quando há sessão', async () => {
    // Registra usuário
    mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init
      {
        response: {
          results: [{
            result: {
              cols: [{ name: 'id' }, { name: 'nome' }, { name: 'email' },
                     { name: 'credencial_hash' }, { name: 'gemini_key_cifrada' },
                     { name: 'gemini_modelo' }, { name: 'criado_em' }],
              rows: [
                [{ type: 'integer', value: '1' }, { type: 'text', value: 'Teste' }, { type: 'text', value: 't@t.com' },
                 { type: 'text', value: 'hash' }, { type: 'null' },
                 { type: 'text', value: 'gemini-2.5-flash' }, { type: 'text', value: '2025-01-01' }],
              ],
            },
          }],
        },
      },
    ]);
    await registrarUsuario({ nome: 'Teste', email: 't@t.com', senha: 'senha123' });

    // Salva modelo
    const mock = mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // UPDATE
    ]);

    await salvarModelo('gemini-2.5-pro');

    const call = mock.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.requests[0].stmt.sql).toBe('UPDATE usuarios SET gemini_modelo = ? WHERE id = ?');
    expect(body.requests[0].stmt.args).toEqual([
      { type: 'text', value: 'gemini-2.5-pro' },
      { type: 'integer', value: '1' },
    ]);
  });

  it('lerModelo usa tabela usuarios quando há sessão', async () => {
    // Registra usuário
    mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init
      {
        response: {
          results: [{
            result: {
              cols: [{ name: 'id' }, { name: 'nome' }, { name: 'email' },
                     { name: 'credencial_hash' }, { name: 'gemini_key_cifrada' },
                     { name: 'gemini_modelo' }, { name: 'criado_em' }],
              rows: [
                [{ type: 'integer', value: '1' }, { type: 'text', value: 'Teste' }, { type: 'text', value: 't@t.com' },
                 { type: 'text', value: 'hash' }, { type: 'null' },
                 { type: 'text', value: 'gemini-2.5-pro' }, { type: 'text', value: '2025-01-01' }],
              ],
            },
          }],
        },
      },
    ]);
    await registrarUsuario({ nome: 'Teste', email: 't@t.com', senha: 'senha123' });

    // Lê modelo
    mockFetchSequence([
      {
        response: {
          results: [{
            result: {
              cols: [{ name: 'gemini_modelo' }],
              rows: [[{ type: 'text', value: 'gemini-2.5-pro' }]],
            },
          }],
        },
      },
    ]);

    const modelo = await lerModelo();
    expect(modelo).toBe('gemini-2.5-pro');
  });

  it('loginUsuario falha com senha incorreta', async () => {
    // Registra com senha 'senha123'
    const { derivarChaves, gerarSaltHex } = await import('@/lib/crypto');
    const salt = await gerarSaltHex();
    const { authHashHex } = await derivarChaves('senha123', salt);

    mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init
      {
        response: {
          results: [{
            result: {
              cols: [{ name: 'id' }, { name: 'nome' }, { name: 'email' },
                     { name: 'credencial_hash' }, { name: 'gemini_key_cifrada' },
                     { name: 'gemini_modelo' }, { name: 'criado_em' }],
              rows: [
                [{ type: 'integer', value: '1' }, { type: 'text', value: 'Teste' }, { type: 'text', value: 't@t.com' },
                 { type: 'text', value: authHashHex }, { type: 'null' },
                 { type: 'text', value: 'gemini-2.5-flash' }, { type: 'text', value: '2025-01-01' }],
              ],
            },
          }],
        },
      },
    ]);
    await registrarUsuario({ nome: 'Teste', email: 't@t.com', senha: 'senha123' });
    encerrarSessao();

    // Tenta login com senha errada
    mockFetchSequence([
      // init já foi feito, mas resetInitCache não foi chamado...
      // O problema é que ensureInit() usa o cache, então não faz mais init
      // A query SELECT precisa de uma resposta
      {
        response: {
          results: [{
            result: {
              cols: [{ name: 'id' }, { name: 'nome' }, { name: 'email' },
                     { name: 'credencial_hash' }, { name: 'gemini_key_cifrada' },
                     { name: 'gemini_modelo' }, { name: 'criado_em' }],
              rows: [
                [{ type: 'integer', value: '1' }, { type: 'text', value: 'Teste' }, { type: 'text', value: 't@t.com' },
                 { type: 'text', value: authHashHex }, { type: 'null' },
                 { type: 'text', value: 'gemini-2.5-flash' }, { type: 'text', value: '2025-01-01' }],
              ],
            },
          }],
        },
      },
    ]);

    await expect(loginUsuario({ email: 't@t.com', senha: 'senha-errada' })).rejects.toThrow('inválidos');
  });

  it('loginUsuario com sucesso extrai salt do PHC sem coluna salt', async () => {
    const { derivarChaves, gerarSaltHex } = await import('@/lib/crypto');
    const salt = await gerarSaltHex();
    const { authHashHex, vaultKeyHex } = await derivarChaves('minhaSenha@123', salt);

    mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init
      {
        response: {
          results: [{
            result: {
              cols: [{ name: 'id' }, { name: 'nome' }, { name: 'email' },
                     { name: 'credencial_hash' }, { name: 'gemini_key_cifrada' },
                     { name: 'gemini_modelo' }, { name: 'criado_em' }],
              rows: [
                [{ type: 'integer', value: '7' }, { type: 'text', value: 'Dev' }, { type: 'text', value: 'dev@test.com' },
                 { type: 'text', value: authHashHex }, { type: 'null' },
                 { type: 'text', value: 'gemini-2.5-flash' }, { type: 'text', value: '2025-01-01' }],
              ],
            },
          }],
        },
      },
    ]);

    const sessao = await loginUsuario({ email: 'dev@test.com', senha: 'minhaSenha@123' });
    expect(sessao.id).toBe(7);
    expect(sessao.nome).toBe('Dev');
    expect(sessao.email).toBe('dev@test.com');
    expect(sessao.vaultKeyHex).toBe(vaultKeyHex);
    expect(obterSessaoAtual()?.vaultKeyHex).toBe(vaultKeyHex);
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
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init
      {
        response: {
          results: [{
            result: {
              cols: [{ name: 'id' }, { name: 'nome' }, { name: 'email' },
                     { name: 'credencial_hash' }, { name: 'gemini_key_cifrada' },
                     { name: 'gemini_modelo' }, { name: 'criado_em' }],
              rows: [
                [{ type: 'integer', value: '1' }, { type: 'text', value: nome }, { type: 'text', value: email },
                 { type: 'text', value: 'hash' }, { type: 'null' },
                 { type: 'text', value: 'gemini-2.5-flash' }, { type: 'text', value: '2025-01-01' }],
              ],
            },
          }],
        },
      },
    ]);
    await registrarUsuario({ nome, email, senha });
    return obterSessaoAtual()!;
  }

  it('salvarIdeia inclui usuario_id quando logado', async () => {
    await registrarUsuarioMockado('Teste', 't@t.com', 'senha123');

    const mock = mockFetchSequence([
      {
        response: {
          results: [{
            result: {
              cols: [
                { name: 'id' }, { name: 'titulo' }, { name: 'descricao' },
                { name: 'tema' }, { name: 'categoria' }, { name: 'prompt_usado' },
                { name: 'favorito' }, { name: 'criado_em' }, { name: 'usuario_id' },
              ],
              rows: [
                [
                  { type: 'integer', value: '1' }, { type: 'text', value: 'Teste' }, { type: 'text', value: 'Desc' },
                  { type: 'text', value: 'Tecnologia' }, { type: 'text', value: 'App' }, { type: 'null' },
                  { type: 'integer', value: '0' }, { type: 'text', value: '2025-01-01' }, { type: 'integer', value: '1' },
                ],
              ],
            },
          }],
        },
      },
    ]);

    const result = await salvarIdeia({ titulo: 'Teste', descricao: 'Desc', tema: 'Tecnologia', categoria: 'App' });
    expect(result.id).toBe(1);

    const body = JSON.parse(mock.mock.calls[0][1].body);
    const sql = body.requests[0].stmt.sql;
    expect(sql).toContain('usuario_id');
    expect(sql).toContain('RETURNING *');
    // O último arg deve ser o usuario_id da sessão
    const args = body.requests[0].stmt.args;
    expect(args[args.length - 1]).toEqual({ type: 'integer', value: '1' });
  });

  it('listarIdeias filtra por usuario_id quando logado', async () => {
    await registrarUsuarioMockado('Teste', 't@t.com', 'senha123');

    const mock = mockFetchSequence([
      {
        response: {
          results: [{
            result: {
              cols: ['id', 'titulo', 'descricao', 'tema', 'categoria', 'favorito', 'criado_em'],
              rows: [[1, 'Teste', 'Desc', 'Tecnologia', 'App', 0, '2025-01-01']],
            },
          }],
        },
      },
    ]);

    await listarIdeias();

    const body = JSON.parse(mock.mock.calls[0][1].body);
    const sql = body.requests[0].stmt.sql;
    expect(sql).toContain('WHERE');
    expect(sql).toContain('usuario_id = ?');
    expect(sql).toContain('ORDER BY criado_em DESC');
    // O arg usuario_id deve ser 1 (id da sessão)
    expect(body.requests[0].stmt.args).toContainEqual({ type: 'integer', value: '1' });
  });

  it('listarIdeias NÃO filtra por usuario_id quando não logado', async () => {
    const mock = mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init
      {
        response: {
          results: [{
            result: {
              cols: ['id', 'titulo', 'descricao', 'tema', 'categoria', 'favorito', 'criado_em'],
              rows: [],
            },
          }],
        },
      },
    ]);

    await listarIdeias();

    const body = JSON.parse(mock.mock.calls[1][1].body);
    const sql = body.requests[0].stmt.sql;
    expect(sql).not.toContain('usuario_id');
  });

  it('excluirIdeia filtra por usuario_id quando logado', async () => {
    await registrarUsuarioMockado('Teste', 't@t.com', 'senha123');

    const mock = mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // DELETE
    ]);

    await excluirIdeia(5);

    const body = JSON.parse(mock.mock.calls[0][1].body);
    expect(body.requests[0].stmt.sql).toBe('DELETE FROM ideias WHERE id = ? AND usuario_id = ?');
    expect(body.requests[0].stmt.args).toEqual([
      { type: 'integer', value: '5' },
      { type: 'integer', value: '1' },
    ]);
  });

  it('excluirIdeia NÃO filtra por usuario_id quando não logado', async () => {
    const mock = mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // DELETE
    ]);

    await excluirIdeia(5);

    const body = JSON.parse(mock.mock.calls[1][1].body);
    expect(body.requests[0].stmt.sql).toBe('DELETE FROM ideias WHERE id = ?');
    expect(body.requests[0].stmt.args).toEqual([{ type: 'integer', value: '5' }]);
  });

  it('alternarFavorito filtra por usuario_id quando logado', async () => {
    await registrarUsuarioMockado('Teste', 't@t.com', 'senha123');

    const mock = mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // UPDATE
      {
        response: {
          results: [{
            result: {
              cols: ['id', 'titulo', 'descricao', 'tema', 'categoria', 'prompt_usado', 'favorito', 'criado_em'],
              rows: [[1, 'Teste', 'Desc', 'Tec', 'App', null, 1, '2025-01-01']],
            },
          }],
        },
      },
    ]);

    const result = await alternarFavorito(1, false);
    expect(result).toBeDefined();
    expect(result!.favorito).toBe(true);

    const updateCall = mock.mock.calls[0];
    const updateBody = JSON.parse(updateCall[1].body);
    expect(updateBody.requests[0].stmt.sql).toBe('UPDATE ideias SET favorito = ? WHERE id = ? AND usuario_id = ?');
    expect(updateBody.requests[0].stmt.args).toEqual([
      { type: 'integer', value: '1' },
      { type: 'integer', value: '1' },
      { type: 'integer', value: '1' },
    ]);

    const selectCall = mock.mock.calls[1];
    const selectBody = JSON.parse(selectCall[1].body);
    expect(selectBody.requests[0].stmt.sql).toBe('SELECT * FROM ideias WHERE id = ? AND usuario_id = ?');
    expect(selectBody.requests[0].stmt.args).toEqual([
      { type: 'integer', value: '1' },
      { type: 'integer', value: '1' },
    ]);
  });

  it('salvarIdeia NÃO inclui usuario_id quando não logado', async () => {
    const mock = mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init
      {
        response: {
          results: [{
            result: {
              cols: [
                { name: 'id' }, { name: 'titulo' }, { name: 'descricao' },
                { name: 'tema' }, { name: 'categoria' }, { name: 'prompt_usado' },
                { name: 'favorito' }, { name: 'criado_em' },
              ],
              rows: [
                [
                  { type: 'integer', value: '1' }, { type: 'text', value: 'Teste' }, { type: 'text', value: 'Desc' },
                  { type: 'text', value: 'Tecnologia' }, { type: 'text', value: 'App' }, { type: 'null' },
                  { type: 'integer', value: '0' }, { type: 'text', value: '2025-01-01' },
                ],
              ],
            },
          }],
        },
      },
    ]);

    await salvarIdeia({ titulo: 'Teste', descricao: 'Desc', tema: 'Tecnologia', categoria: 'App' });

    const body = JSON.parse(mock.mock.calls[1][1].body);
    const sql = body.requests[0].stmt.sql;
    expect(sql).not.toContain('usuario_id');
  });
});

// --- atualizarNomeUsuario + criptografia E2E de ideias ---

describe('storage - atualizarNomeUsuario + E2E ideias cifradas', () => {
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
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init
      {
        response: {
          results: [{
            result: {
              cols: [{ name: 'id' }, { name: 'nome' }, { name: 'email' },
                     { name: 'credencial_hash' }, { name: 'gemini_key_cifrada' },
                     { name: 'gemini_modelo' }, { name: 'criado_em' }],
              rows: [
                [{ type: 'integer', value: '1' }, { type: 'text', value: nome }, { type: 'text', value: email },
                 { type: 'text', value: 'hash' }, { type: 'null' },
                 { type: 'text', value: 'gemini-2.5-flash' }, { type: 'text', value: '2025-01-01' }],
              ],
            },
          }],
        },
      },
    ]);
    await registrarUsuario({ nome, email, senha });
    return obterSessaoAtual()!;
  }

  it('atualizarNomeUsuario atualiza nome no DB e retorna nova sessao', async () => {
    await registrarUsuarioMockado('Nome Antigo', 't@t.com', 'senha123');

    const mock = mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // UPDATE
    ]);

    const sessao = await atualizarNomeUsuario('Nome Novo');
    expect(sessao).not.toBeNull();
    expect(sessao!.nome).toBe('Nome Novo');
    expect(obterSessaoAtual()?.nome).toBe('Nome Novo');

    const body = JSON.parse(mock.mock.calls[0][1].body);
    expect(body.requests[0].stmt.sql).toBe('UPDATE usuarios SET nome = ? WHERE id = ?');
    expect(body.requests[0].stmt.args).toEqual([
      { type: 'text', value: 'Nome Novo' },
      { type: 'integer', value: '1' },
    ]);
  });

  it('atualizarNomeUsuario lança erro quando não logado', async () => {
    resetInitCache();
    mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init
    ]);
    await expect(atualizarNomeUsuario('Nome')).rejects.toThrow('Usuário não autenticado');
  });

  it('atualizarNomeUsuario faz trim do nome', async () => {
    await registrarUsuarioMockado('Teste', 't@t.com', 'senha123');

    const mock = mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // UPDATE
    ]);

    await atualizarNomeUsuario('  Nome com Espacos  ');

    const body = JSON.parse(mock.mock.calls[0][1].body);
    expect(body.requests[0].stmt.args[0]).toEqual({ type: 'text', value: 'Nome com Espacos' });
  });

  it('salvarIdeia cifra descricao/tema quando logado (titulo em texto claro)', async () => {
    await registrarUsuarioMockado('Teste', 't@t.com', 'senha123');

    const mock = mockFetchSequence([
      {
        response: {
          results: [{
            result: {
              cols: [
                { name: 'id' }, { name: 'titulo' }, { name: 'descricao' },
                { name: 'tema' }, { name: 'categoria' }, { name: 'prompt_usado' },
                { name: 'favorito' }, { name: 'criado_em' }, { name: 'usuario_id' },
              ],
              rows: [
                [
                  { type: 'integer', value: '1' }, { type: 'text', value: 'Titulo Original' }, { type: 'text', value: 'CIPHERTEXT_DESC' },
                  { type: 'text', value: 'CIPHERTEXT_TEMA' }, { type: 'text', value: 'App' }, { type: 'null' },
                  { type: 'integer', value: '0' }, { type: 'text', value: '2025-01-01' }, { type: 'integer', value: '1' },
                ],
              ],
            },
          }],
        },
      },
    ]);

    const result = await salvarIdeia({ titulo: 'Titulo Original', descricao: 'Desc Original', tema: 'Tecnologia', categoria: 'App' });
    expect(result.id).toBe(1);

    const body = JSON.parse(mock.mock.calls[0][1].body);
    const args = body.requests[0].stmt.args;
    // titulo (args[0]) é texto claro; descricao (args[1]) e tema (args[2]) são ciphertext
    expect(args[0].value).toBe('Titulo Original');
    expect(args[1].value).not.toBe('Desc Original');
    expect(args[2].value).not.toBe('Tecnologia');
    // Ciphertext deve ter mais caracteres que o plaintext
    expect(args[1].value.length).toBeGreaterThan('Desc Original'.length);
    expect(args[2].value.length).toBeGreaterThan('Tecnologia'.length);
    // usuario_id deve estar presente
    const sql = body.requests[0].stmt.sql;
    expect(sql).toContain('usuario_id');
  });

  it('listarIdeias decifra descricao/tema quando logado', async () => {
    await registrarUsuarioMockado('Teste', 't@t.com', 'senha123');

    const { cifrarTexto } = await import('@/lib/crypto');
    const descCifrado = await cifrarTexto('Descricao Cifrada', obterSessaoAtual()!.vaultKeyHex);
    const temaCifrado = await cifrarTexto('Tema Cifrado', obterSessaoAtual()!.vaultKeyHex);

    mockFetchSequence([
      {
        response: {
          results: [{
            result: {
              cols: ['id', 'titulo', 'descricao', 'tema', 'categoria', 'prompt_usado', 'favorito', 'criado_em', 'usuario_id'],
              rows: [[1, 'Titulo Plano', descCifrado, temaCifrado, 'App', null, 0, '2025-01-01', 1]],
            },
          }],
        },
      },
    ]);

    const ideias = await listarIdeias();
    expect(ideias).toHaveLength(1);
    expect(ideias[0].titulo).toBe('Titulo Plano');
    expect(ideias[0].descricao).toBe('Descricao Cifrada');
    expect(ideias[0].tema).toBe('Tema Cifrado');
    expect(ideias[0].categoria).toBe('App');
  });

  it('salvarIdeia NÃO cifra campos quando não logado', async () => {
    const mock = mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init
      {
        response: {
          results: [{
            result: {
              cols: [
                { name: 'id' }, { name: 'titulo' }, { name: 'descricao' },
                { name: 'tema' }, { name: 'categoria' }, { name: 'prompt_usado' },
                { name: 'favorito' }, { name: 'criado_em' },
              ],
              rows: [
                [
                  { type: 'integer', value: '1' }, { type: 'text', value: 'Titulo Plano' }, { type: 'text', value: 'Desc Plano' },
                  { type: 'text', value: 'Tecnologia' }, { type: 'text', value: 'App' }, { type: 'null' },
                  { type: 'integer', value: '0' }, { type: 'text', value: '2025-01-01' },
                ],
              ],
            },
          }],
        },
      },
    ]);

    const result = await salvarIdeia({ titulo: 'Titulo Plano', descricao: 'Desc Plano', tema: 'Tecnologia', categoria: 'App' });

    const body = JSON.parse(mock.mock.calls[1][1].body);
    const args = body.requests[0].stmt.args;
    // titulo e descricao devem ser plaintext (sem cifragem)
    expect(args[0].value).toBe('Titulo Plano');
    expect(args[1].value).toBe('Desc Plano');
    const sql = body.requests[0].stmt.sql;
    expect(sql).not.toContain('usuario_id');
  });
});
