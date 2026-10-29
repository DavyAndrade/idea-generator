import { json, errorResponse, authenticateRequest } from '../_lib/http';
import { execute, initTursoServer } from '../_lib/turso';

export async function PATCH(req: Request): Promise<Response> {
  try {
    await initTursoServer();

    const auth = await authenticateRequest(req);
    if (!auth) {
      return errorResponse('Não autorizado', 401);
    }

    const body = (await req.json()) as { nome?: string };
    const nome = body.nome?.trim();
    if (!nome) {
      return errorResponse('Nome inválido', 400);
    }

    await execute('UPDATE usuarios SET nome = ? WHERE id = ?', [nome, auth.userId]);
    return json({ ok: true, nome });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(`Erro ao atualizar perfil: ${msg}`, 500);
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'PATCH') return PATCH(req);
  return errorResponse('Método não permitido', 405);
}
