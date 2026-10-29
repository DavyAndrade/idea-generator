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
  resetInitCache,
  testarConexaoTurso,
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
    const selectCall = mock.mock.calls[3];
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

  it('listarIdeias com busca e filtro de favoritas', async () => {
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
    expect(sql).toContain('LIKE ?');
    expect(sql).toContain('ORDER BY criado_em DESC');
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
    expect(body.requests[0].stmt.sql).toBe('UPDATE ideia SET favorito = ? WHERE id = ?');
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
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init 2
      { response: { results: [{ result: { rows: [[{ type: 'text', value: '' }]], cols: [{ name: 'valor' }] } }] } }, // SELECT
    ]);

    await lerChave();
    resetInitCache();
    await lerChave();

    expect((globalThis as any).fetch.mock.calls.length).toBe(3);
  });

  it('testarConexaoTurso re-exportado funciona', async () => {
    mockFetchSequence([
      { response: { results: [{ result: { rows: [], cols: [] } }] } }, // init
    ]);

    const result = await testarConexaoTurso();
    expect(result.ok).toBe(true);
  });
});
