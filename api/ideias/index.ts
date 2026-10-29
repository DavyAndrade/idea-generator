import { json, errorResponse, authenticateRequest, createApiHandler } from '../_lib/http.js';
import { query, execute, initTursoServer } from '../_lib/turso.js';

export async function GET(req: Request): Promise<Response> {
  try {
    await initTursoServer();

    const auth = await authenticateRequest(req);
    if (!auth) {
      return errorResponse('Não autorizado', 401);
    }

    const rows = await query<Record<string, unknown>>(
      `SELECT id, usuario_id, titulo, descricao, tema, categoria, prompt_usado, favorito, criado_em
       FROM ideias
       WHERE usuario_id = ?
       ORDER BY id DESC`,
      [auth.userId]
    );

    const ideias = rows.map((r) => ({
      id: Number(r.id),
      usuarioId: Number(r.usuario_id),
      titulo: String(r.titulo),
      descricao: String(r.descricao),
      tema: String(r.tema),
      categoria: String(r.categoria),
      promptUsado: r.prompt_usado ? String(r.prompt_usado) : undefined,
      favorito: Boolean(r.favorito),
      criadoEm: String(r.criado_em),
    }));

    return json({ ideias });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(`Erro ao listar ideias: ${msg}`, 500);
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    await initTursoServer();

    const auth = await authenticateRequest(req);
    if (!auth) {
      return errorResponse('Não autorizado', 401);
    }

    const body = (await req.json()) as {
      titulo?: string;
      descricao?: string;
      tema?: string;
      categoria?: string;
      promptUsado?: string;
    };

    if (!body.titulo || !body.descricao || !body.tema || !body.categoria) {
      return errorResponse('Campos obrigatórios ausentes', 400);
    }

    const criadoEm = new Date().toISOString();
    const rows = await query<Record<string, unknown>>(
      `INSERT INTO ideias (usuario_id, titulo, descricao, tema, categoria, prompt_usado, favorito, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)
       RETURNING id, usuario_id, titulo, descricao, tema, categoria, prompt_usado, favorito, criado_em`,
      [
        auth.userId,
        body.titulo,
        body.descricao,
        body.tema,
        body.categoria,
        body.promptUsado || null,
        criadoEm,
      ]
    );

    const r = rows[0];
    const ideia = {
      id: Number(r.id),
      usuarioId: Number(r.usuario_id),
      titulo: String(r.titulo),
      descricao: String(r.descricao),
      tema: String(r.tema),
      categoria: String(r.categoria),
      promptUsado: r.prompt_usado ? String(r.prompt_usado) : undefined,
      favorito: false,
      criadoEm: String(r.criado_em),
    };

    return json({ ideia }, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(`Erro ao salvar ideia: ${msg}`, 500);
  }
}

export async function PATCH(req: Request): Promise<Response> {
  try {
    await initTursoServer();

    const auth = await authenticateRequest(req);
    if (!auth) {
      return errorResponse('Não autorizado', 401);
    }

    const body = (await req.json()) as { id?: number; favorito?: boolean };
    if (typeof body.id !== 'number' || typeof body.favorito !== 'boolean') {
      return errorResponse('id e favorito são obrigatórios', 400);
    }

    await execute(
      'UPDATE ideias SET favorito = ? WHERE id = ? AND usuario_id = ?',
      [body.favorito ? 1 : 0, body.id, auth.userId]
    );

    return json({ ok: true, id: body.id, favorito: body.favorito });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(`Erro ao atualizar ideia: ${msg}`, 500);
  }
}

export async function DELETE(req: Request): Promise<Response> {
  try {
    await initTursoServer();

    const auth = await authenticateRequest(req);
    if (!auth) {
      return errorResponse('Não autorizado', 401);
    }

    const url = new URL(req.url);
    const idParam = url.searchParams.get('id');
    const id = idParam ? parseInt(idParam, 10) : NaN;

    if (!id || isNaN(id)) {
      return errorResponse('Parâmetro id inválido', 400);
    }

    // Verifica existência antes de deletar (404 se nao existe ou nao pertence ao usuario)
    const existing = await query<Record<string, unknown>>(
      'SELECT id FROM ideias WHERE id = ? AND usuario_id = ?',
      [id, auth.userId]
    );
    if (existing.length === 0) {
      return errorResponse('Ideia não encontrada', 404);
    }

    await execute('DELETE FROM ideias WHERE id = ? AND usuario_id = ?', [id, auth.userId]);
    return json({ ok: true, id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(`Erro ao excluir ideia: ${msg}`, 500);
  }
}

async function handler(req: Request): Promise<Response> {
  switch (req.method) {
    case 'GET':
      return GET(req);
    case 'POST':
      return POST(req);
    case 'PATCH':
      return PATCH(req);
    case 'DELETE':
      return DELETE(req);
    default:
      return errorResponse('Método não permitido', 405);
  }
}

export default createApiHandler(handler);
