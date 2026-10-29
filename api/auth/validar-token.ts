import { json, errorResponse } from '../_lib/http';
import { query, initTursoServer } from '../_lib/turso';
import { hashToken } from '../_lib/tokens';

export async function POST(req: Request): Promise<Response> {
  try {
    await initTursoServer();

    const body = (await req.json()) as { token?: string };
    const token = body.token?.trim();

    if (!token) {
      return errorResponse('Token inválido', 400);
    }

    const tokenHash = await hashToken(token);

    const rows = await query<Record<string, unknown>>(
      `SELECT id, usuario_id, expira_em, usado
       FROM tokens_recuperacao
       WHERE token_hash = ?
       ORDER BY criado_em DESC
       LIMIT 1`,
      [tokenHash]
    );

    if (rows.length === 0) {
      return errorResponse('Token inválido', 404);
    }

    const entry = rows[0];

    if (Number(entry.usado) === 1) {
      return errorResponse('Token já utilizado', 400);
    }

    const expiraEm = String(entry.expira_em);
    if (new Date(expiraEm).getTime() < Date.now()) {
      return errorResponse('Token expirado', 400);
    }

    return json({ ok: true, usuarioId: Number(entry.usuario_id) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(`Erro ao validar token: ${msg}`, 500);
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'POST') return POST(req);
  return errorResponse('Método não permitido', 405);
}
