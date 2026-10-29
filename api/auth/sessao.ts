import { json, errorResponse, authenticateRequest } from '../_lib/http';
import { query, initTursoServer } from '../_lib/turso';

export async function GET(req: Request): Promise<Response> {
  try {
    await initTursoServer();

    const auth = await authenticateRequest(req);
    if (!auth) {
      return errorResponse('Não autorizado', 401);
    }

    const rows = await query<Record<string, unknown>>(
      'SELECT id, nome, email, gemini_modelo, gemini_key_cifrada FROM usuarios WHERE id = ?',
      [auth.userId]
    );

    if (rows.length === 0) {
      return errorResponse('Usuário não encontrado', 404);
    }

    const user = rows[0];
    return json({
      user: {
        id: Number(user.id),
        nome: String(user.nome),
        email: String(user.email),
        geminiModelo: String(user.gemini_modelo),
      },
      geminiKeyCifrada: user.gemini_key_cifrada ? String(user.gemini_key_cifrada) : null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(`Erro na sessão: ${msg}`, 500);
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'GET') return GET(req);
  return errorResponse('Método não permitido', 405);
}
