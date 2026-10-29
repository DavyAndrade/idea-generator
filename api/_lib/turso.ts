// Cliente HTTP server-side para a API Pipeline v2 do Turso (Hrana v2)
// Lê apenas credenciais do ambiente do servidor (process.env)

function getBaseUrl(): string {
  const raw =
    process.env.TURSO_DATABASE_URL ||
    process.env.VITE_TURSO_DATABASE_URL ||
    '';
  if (!raw.trim()) throw new Error('TURSO_DATABASE_URL não configurada no servidor');
  return raw
    .trim()
    .replace(/^(libsql|turso|wss):\/\//i, 'https://')
    .replace(/^ws:\/\//i, 'http://')
    .replace(/\/+$/, '');
}

function getToken(): string {
  const token =
    process.env.TURSO_AUTH_TOKEN ||
    process.env.VITE_TURSO_AUTH_TOKEN ||
    '';
  if (!token.trim()) throw new Error('TURSO_AUTH_TOKEN não configurado no servidor');
  return token.trim();
}

function encodeArg(v: unknown): { type: string; value?: string | number | boolean } {
  if (v === null || v === undefined) return { type: 'null' };
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return { type: 'integer', value: String(v) };
    return { type: 'float', value: v };
  }
  if (typeof v === 'boolean') return { type: 'text', value: String(v) };
  return { type: 'text', value: String(v) };
}

interface HranaArgs {
  sql?: string;
  args?: unknown[];
}

interface HranaInnerResult {
  rows?: unknown[];
  cols?: Array<{ name: string }>;
  columns?: string[];
}

interface HranaResult extends HranaInnerResult {
  result?: HranaInnerResult;
  response?: { result?: HranaInnerResult };
  error?: { code: string; message: string };
}

interface HranaResponse {
  results: HranaResult[];
}

async function pipeline(statements: HranaArgs[]): Promise<HranaResponse> {
  const baseUrl = getBaseUrl();
  const token = getToken();

  const requests = [
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

export async function execute(sql: string, args: unknown[] = []): Promise<void> {
  await pipeline([{ sql, args }]);
}

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

  return [];
}

let initialized = false;

export async function initTursoServer(): Promise<void> {
  if (initialized) return;

  await execute(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      credencial_hash TEXT NOT NULL,
      gemini_key_cifrada TEXT,
      gemini_modelo TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
      recovery_envelope TEXT, -- AES-256-GCM envelope do vaultKey, cifrado com recoveryKey (zero-knowledge)
      recovery_code_hash TEXT, -- hash do código de recuperação (para validação server-side)
      criado_em TEXT NOT NULL
    );
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS ideias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      titulo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      tema TEXT NOT NULL,
      categoria TEXT NOT NULL,
      prompt_usado TEXT,
      favorito INTEGER NOT NULL DEFAULT 0,
      criado_em TEXT NOT NULL
    );
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS tokens_recuperacao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      token_hash TEXT NOT NULL,
      expira_em TEXT NOT NULL,
      usado INTEGER NOT NULL DEFAULT 0,
      criado_em TEXT NOT NULL
    );
  `);

  initialized = true;
}
