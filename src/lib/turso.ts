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
  const raw = getEnv('VITE_TURSO_DATABASE_URL')?.trim();
  if (!raw) return null;
  // libsql://, turso:// ou wss:// → https://
  return raw
    .replace(/^(libsql|turso|wss):\/\//i, 'https://')
    .replace(/^ws:\/\//i, 'http://')
    .replace(/\/+$/, '');
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

interface HranaInnerResult {
  rows?: unknown[];
  cols?: Array<{ name: string }>;
  columns?: string[];
  lastInsertRowid?: string | number;
  statistics?: { rowCount?: number };
}

interface HranaResult extends HranaInnerResult {
  result?: HranaInnerResult;
  response?: { result?: HranaInnerResult };
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
  const entry = res.results?.[0];

  if (entry?.error) {
    throw new Error(`Turso error: ${entry.error.code} — ${entry.error.message}`);
  }

  const inner: HranaInnerResult | undefined =
    entry?.response?.result ?? entry?.result ?? entry;

  const rows = inner?.rows;
  if (!rows || rows.length === 0) return [];

  // Formato Hrana v2: inner.cols é Array<{ name: string }>
  if (inner.cols) {
    const cols = inner.cols as Array<{ name: string }>;
    return rows.map((row) => {
      const r = row as unknown[];
      const obj: Record<string, unknown> = {};
      cols.forEach((col, i) => {
        const colName = typeof col === 'string' ? col : col.name;
        obj[colName] = extractValue(r[i]);
      });
      return obj as T;
    });
  }

  // Formato simples: inner.columns é string[] e rows são arrays primitivos
  const columns = inner.columns as string[] | undefined;
  if (columns) {
    return rows.map((row) => {
      const r = row as unknown[];
      const obj: Record<string, unknown> = {};
      columns.forEach((col, i) => {
        obj[col] = extractValue(r[i]);
      });
      return obj as T;
    });
  }

  return [];
}

// Inicialização automática das tabelas (tudo em uma única chamada pipeline)
export async function initTurso(): Promise<void> {
  await pipeline([
    {
      sql: `
        CREATE TABLE IF NOT EXISTS configuracoes (
          chave TEXT PRIMARY KEY,
          valor TEXT NOT NULL
        )
      `,
    },
    {
      sql: `
        CREATE TABLE IF NOT EXISTS ideias (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          usuario_id INTEGER,
          titulo TEXT NOT NULL,
          descricao TEXT NOT NULL,
          tema TEXT NOT NULL,
          categoria TEXT NOT NULL,
          prompt_usado TEXT,
          favorito INTEGER NOT NULL DEFAULT 0,
          criado_em TEXT NOT NULL
        )
      `,
    },
    {
      sql: `
        CREATE TABLE IF NOT EXISTS usuarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          salt TEXT NOT NULL,
          credencial_hash TEXT NOT NULL,
          gemini_key_cifrada TEXT,
          gemini_modelo TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
          criado_em TEXT NOT NULL
        )
      `,
    },
  ]);
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
