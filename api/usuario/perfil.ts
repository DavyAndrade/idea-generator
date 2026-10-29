import { json, errorResponse, authenticateRequest, createApiHandler } from '../_lib/http';
import { execute, initTursoServer } from '../_lib/turso';

export async function PATCH(req: Request): Promise<Response> {
  try {
    await initTursoServer();

    const auth = await authenticateRequest(req);
    if (!auth) {
      return errorResponse('Não autorizado', 401);
    }

    const body = (await req.json()) as {
      nome?: string;
      recoveryEnvelope?: string;
      recoveryEnvelop?: string;
    };

    if (body.nome?.trim()) {
      await execute('UPDATE usuarios SET nome = ? WHERE id = ?', [
        body.nome.trim(),
        auth.userId,
      ]);
    }

    const envelope = body.recoveryEnvelope || body.recoveryEnvelop;
    if (envelope) {
      await execute(
        'UPDATE usuarios SET recovery_envelope = ? WHERE id = ?',
        [envelope, auth.userId]
      );
    }

    return json({ ok: true, nome: body.nome?.trim() });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(`Erro ao atualizar perfil: ${msg}`, 500);
  }
}

async function handler(req: Request): Promise<Response> {
  if (req.method === 'PATCH') return PATCH(req);
  return errorResponse('Método não permitido', 405);
}

export default createApiHandler(handler);
