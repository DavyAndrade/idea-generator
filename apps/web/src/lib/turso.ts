/// <reference types="vite/client" />
// Cliente HTTP enxuto para a API Pipeline v2 do Turso (Hrana v2).
// Converte libsql:// → https:// e faz POST em /v2/pipeline.
import type { Ideia } from '@/types';

// Função injetável para leitura de env — facilita testes unitários
// Em runtime (Vite) lê import.meta.env; em testes (Bun) cai para process.env
export function getEnv(key: string): string | undefined {
  const vite = (import.meta.env || {})[key];
  if (vite !== undefined) return vite;
  return typeof process !== 'undefined' ? process.env[key] : undefined;
}

function getBaseUrl(): string | null {
  const raw = getEnv('VITE_TURSO_DATABASE_URL');
  if (!raw) return null;
  // libsql://nome.turso.io → https://nome.turso.io
  return raw.replace(/^libsql:/, 'https:');
}

function getToken(): string | null {
  return getEnv('VITE_TURSO_AUTH_TOKEN') ?? null;
}

// Codifica argumentos no formato Hrana v2
function encodeArg(v: unknown): { type: string; value?: string | number | boolean } {
  if (v === null) return { type: 'null' };
  if (typeof v === 'number') {
    // Inteiro vs float: Number.isInteger verdadeiro → integer
    if (Number.isInteger(v)) return { type: 'integer', value: String(v) };
    return { type: 'float', value: v };
  }
  if (typeof v === 'boolean') return { type: 'text', value: String(v) };
  return { type: 'text', value: String(v) };
}

interface HranaArgs {
  sql?: string;
  args?: unknown[];
  row?: unknown[];
}

interface HranaResult {
  rows?: unknown[];
  cols?: Array<{ name: string }>;
  columns?: string[];
  lastInsertRowid?: string | number;
  statistics?: { rowCount?: number };
  error?: { code: string; message: string };
}

interface HranaResponse {
  results: HranaResult[];
}

// Request Hrana v2: { type: 'execute', stmt: { sql, args } } + { type: 'close' }
interface HranaRequest {
  type: string;
  stmt?: HranaArgs;
}

async function pipeline(statements: HranaArgs[]): Promise<HranaResponse> {
  const baseUrl = getBaseUrl();
  const token = getToken();

  if (!baseUrl) throw new Error('VITE_TURSO_DATABASE_URL não configurada');
  if (!token) throw new Error('VITE_TURSO_AUTH_TOKEN não configurado');

  const requests: HranaRequest[] = [
    ...statements.map((s) => ({
      type: 'execute' as const,
      stmt: { sql: s.sql, args: s.args?.map(encodeArg) },
    })),
    { type: 'close' as const },
  ];

  const res = await fetch(`${baseUrl}/v2/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!res.ok) {
    throw new Error(`Turso API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<HranaResponse>;
}

// Executa um único statement (CREATE TABLE, INSERT, UPDATE, DELETE)
export async function execute(sql: string, args: unknown[] = []): Promise<void> {
  await pipeline([{ sql, args }]);
}

// Extrai valor do row no formato Hrana v2: { type: 'text', value: 'foo' } ou primitivo direto
function extractValue(cell: unknown): unknown {
  if (cell && typeof cell === 'object' && 'value' in cell) {
    const obj = cell as { type: string; value: unknown };
    if (obj.type === 'null') return null;
    if (obj.type === 'integer') return Number(obj.value);
    if (obj.type === 'float') return Number(obj.value);
    if (obj.type === 'text') return String(obj.value);
    if (obj.type === 'boolean') return String(obj.value) === 'true' ? 1 : 0;
    return obj.value;
  }
  return cell;
}

// Executa um SELECT e retorna as linhas como objetos
// Suporta formato Hrana v2 (cols: {name}[] + rows: cells[][]) e formato simples (columns: string[] + rows: unknown[][])
export async function query<T = Record<string, unknown>>(sql: string, args: unknown[] = []): Promise<T[]> {
  const res = await pipeline([{ sql, args }]);
  const result = res.results[0];

  if (result?.error) {
    throw new Error(`Turso error: ${result.error.code} — ${result.error.message}`);
  }

  const rows = result?.rows;
  if (!rows || rows.length === 0) return [];

  // Formato Hrana v2: result.cols é Array<{ name: string }>
  if (result.cols) {
    const cols = result.cols as Array<{ name: string }>;
    return rows.map((row) => {
      const r = row as unknown[];
      const obj: Record<string, unknown> = {};
      cols.forEach((col, i) => {
        obj[col.name] = extractValue(r[i]);
      });
      return obj as T;
    });
  }

  // Formato simples: result.columns é string[] e rows são arrays primitivos
  const columns = result.columns as string[] | undefined;
  if (columns) {
    return rows.map((row) => {
      const r = row as unknown[];
      const obj: Record<string, unknown> = {};
      columns.forEach((col, i) => {
        obj[col] = r[i];
      });
      return obj as T;
    });
  }

  return [];
}

// Inicialização automática das tabelas
export async function initTurso(): Promise<void> {
  await execute(`
    CREATE TABLE IF NOT EXISTS configuracoes (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    )
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS ideias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      tema TEXT NOT NULL,
      categoria TEXT NOT NULL,
      prompt_usado TEXT,
      favorito INTEGER NOT NULL DEFAULT 0,
      criado_em TEXT NOT NULL
    )
  `);
}

// Testa conexão com Turso
export async function testarConexaoTurso(): Promise<{ ok: boolean; mensagem: string }> {
  try {
    await initTurso();
    return { ok: true, mensagem: 'Conexão com Turso OK' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, mensagem: `Falha: ${msg}` };
  }
}

// Mapeador de row DB → Ideia
export function rowToIdeia(row: Record<string, unknown>): Ideia {
  return {
    id: Number(row.id),
    titulo: String(row.titulo),
    descricao: String(row.descricao),
    tema: String(row.tema),
    categoria: String(row.categoria),
    promptUsado: row.prompt_usado ? String(row.prompt_usado) : undefined,
    favorito: Boolean(Number(row.favorito)),
    criadoEm: String(row.criado_em),
  };
}
