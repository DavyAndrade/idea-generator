// Persistência de tudo no TursoDB.
// - gemini_api_key e gemini_modelo → tabela configuracoes
// - ideias → tabela ideias
import { execute, query, initTurso, rowToIdeia } from '@/lib/turso';
import { MODELO_PADRAO, type Ideia, type ModeloGemini, type NovaIdeiaInput } from '@/types';

// Re-exporta testarConexaoTurso para uso em componentes
export { testarConexaoTurso } from '@/lib/turso';

// Garante tabelas existam antes de qualquer operação
let initPromise: Promise<void> | null = null;
function ensureInit(): Promise<void> {
  if (!initPromise) {
    initPromise = initTurso().catch(() => {
      initPromise = null;
      throw new Error('Não foi possível inicializar o banco Turso');
    });
  }
  return initPromise!;
}

// Reseta o cache de inicialização — útil para testes unitários
export function resetInitCache(): void {
  initPromise = null;
}

// --- Configurações: chave API Gemini ---

export async function lerChave(): Promise<string> {
  await ensureInit();
  const rows = await query<{ valor: string }>(
    'SELECT valor FROM configuracoes WHERE chave = ?',
    ['gemini_api_key'],
  );
  return rows[0]?.valor ?? '';
}

export async function salvarChave(chave: string): Promise<void> {
  await ensureInit();
  await execute(
    'INSERT INTO configuracoes (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor',
    ['gemini_api_key', chave],
  );
}

// --- Configurações: modelo Gemini ---

export async function lerModelo(): Promise<ModeloGemini> {
  await ensureInit();
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

  let sql = 'SELECT * FROM ideias';
  const args: unknown[] = [];
  const conditions: string[] = [];

  if (opcoes?.somenteFavoritas) {
    conditions.push('favorito = 1');
  }

  if (opcoes?.busca) {
    conditions.push('(titulo LIKE ? OR descricao LIKE ? OR tema LIKE ?)');
    const termo = `%${opcoes.busca}%`;
    args.push(termo, termo, termo);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY criado_em DESC';

  const rows = await query<Record<string, unknown>>(sql, args);
  return rows.map(rowToIdeia);
}

export async function salvarIdeia(ideia: NovaIdeiaInput): Promise<Ideia> {
  await ensureInit();

  const criadoEm = ideia.criadoEm ?? new Date().toISOString();
  const favorito = ideia.favorito ? 1 : 0;

  // RETURNING * — last_insert_rowid() em HTTP stateless pode falhar entre chamadas
  const rows = await query<Record<string, unknown>>(
    `INSERT INTO ideias (titulo, descricao, tema, categoria, prompt_usado, favorito, criado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     RETURNING *`,
    [
      ideia.titulo,
      ideia.descricao,
      ideia.tema,
      ideia.categoria,
      ideia.promptUsado ?? null,
      favorito,
      criadoEm,
    ],
  );

  if (rows.length === 0) {
    throw new Error('Falha ao recuperar ideia salva');
  }

  return rowToIdeia(rows[0]);
}

export async function excluirIdeia(id: number): Promise<void> {
  await ensureInit();
  await execute('DELETE FROM ideias WHERE id = ?', [id]);
}

export async function alternarFavorito(id: number, favoritoAtual?: boolean): Promise<Ideia | undefined> {
  await ensureInit();

  const novoValor = favoritoAtual ? 0 : 1;

  await execute(
    'UPDATE ideias SET favorito = ? WHERE id = ?',
    [novoValor, id],
  );

  const rows = await query<Record<string, unknown>>('SELECT * FROM ideias WHERE id = ?', [id]);

  if (rows.length === 0) return undefined;
  return rowToIdeia(rows[0]);
}
