import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { execute, query, testarConexaoTurso } from '@/lib/turso';

function mockFetch(response: unknown, ok = true, status = 200) {
  const mock = vi.fn();
  mock.mockResolvedValue({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: () => Promise.resolve(response),
  });
  (globalThis as any).fetch = mock;
  return mock;
}

beforeEach(() => {
  process.env.VITE_TURSO_DATABASE_URL = 'libsql://test-db.turso.io';
  process.env.VITE_TURSO_AUTH_TOKEN = 'token123';
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.VITE_TURSO_DATABASE_URL;
  delete process.env.VITE_TURSO_AUTH_TOKEN;
});

describe('turso cliente HTTP', () => {
  it('converte libsql:// para https:// na URL', async () => {
    const mock = mockFetch({ results: [{ result: { rows: [], cols: [] } }] });
    await execute('SELECT 1');

    const call = mock.mock.calls[0];
    expect(call[0]).toBe('https://test-db.turso.io/v2/pipeline');
  });

  it('envia header Authorization Bearer', async () => {
    const mock = mockFetch({ results: [{ result: { rows: [], cols: [] } }] });
    await execute('SELECT 1');

    const headers = mock.mock.calls[0][1].headers;
    expect(headers.Authorization).toBe('Bearer token123');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('formata requests no protocolo Hrana v2 (execute + close)', async () => {
    const mock = mockFetch({ results: [{ result: { rows: [], cols: [] } }] });
    await execute('CREATE TABLE test (id INTEGER)', [1, 'text', null]);

    const body = JSON.parse(mock.mock.calls[0][1].body);
    expect(body.requests).toHaveLength(2);
    expect(body.requests[0].type).toBe('execute');
    expect(body.requests[0].stmt.sql).toBe('CREATE TABLE test (id INTEGER)');
    expect(body.requests[0].stmt.args).toEqual([
      { type: 'integer', value: '1' },
      { type: 'text', value: 'text' },
      { type: 'null' },
    ]);
    expect(body.requests[1].type).toBe('close');
  });

  it('lança erro quando VITE_TURSO_DATABASE_URL não configurada', async () => {
    process.env.VITE_TURSO_DATABASE_URL = '';
    await expect(execute('SELECT 1')).rejects.toThrow('VITE_TURSO_DATABASE_URL não configurada');
  });

  it('lança erro quando VITE_TURSO_AUTH_TOKEN não configurado', async () => {
    process.env.VITE_TURSO_AUTH_TOKEN = '';
    await expect(execute('SELECT 1')).rejects.toThrow('VITE_TURSO_AUTH_TOKEN não configurado');
  });

  it('lança erro quando API retorna HTTP error', async () => {
    mockFetch({ error: { code: 'unauthorized', message: 'Invalid token' } }, false, 401);
    await expect(execute('SELECT 1')).rejects.toThrow('Turso API error: 401');
  });

  it('lança erro quando response contém error de resultado', async () => {
    mockFetch({ results: [{ error: { code: 'table_not_found', message: 'no such table' } }] });
    await expect(query('SELECT * FROM ideias')).rejects.toThrow('Turso error: table_not_found');
  });

  it('parseia formato Hrana v2 (cols + rows)', async () => {
    mockFetch({
      results: [{
        result: {
          rows: [
            [{ type: 'integer', value: '1' }, { type: 'text', value: 'Teste' }],
          ],
          cols: [{ name: 'id' }, { name: 'titulo' }],
        },
      }],
    });
    const rows = await query('SELECT id, titulo FROM ideias');
    expect(rows[0]).toEqual({ id: 1, titulo: 'Teste' });
  });

  it('parseia formato simples (columns + rows primitivos)', async () => {
    mockFetch({
      results: [{
        result: {
          columns: ['id', 'titulo'],
          rows: [[1, 'Teste']],
        },
      }],
    });
    const rows = await query('SELECT id, titulo FROM ideias');
    expect(rows[0]).toEqual({ id: 1, titulo: 'Teste' });
  });

  it('retorna array vazio quando não há rows', async () => {
    mockFetch({ results: [{ result: { rows: [], cols: ['id'] } }] });
    const rows = await query('SELECT * FROM ideias');
    expect(rows).toEqual([]);
  });

  it('testarConexaoTurso retorna ok=true', async () => {
    mockFetch({ results: [{ result: { rows: [], cols: [] } }] });
    const result = await testarConexaoTurso();
    expect(result.ok).toBe(true);
    expect(result.mensagem).toContain('OK');
  });

  it('testarConexaoTurso retorna ok=false em erro', async () => {
    mockFetch({ error: 'fail' }, false, 500);
    const result = await testarConexaoTurso();
    expect(result.ok).toBe(false);
    expect(result.mensagem).toContain('Falha');
  });
});
