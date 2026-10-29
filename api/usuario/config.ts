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
      'SELECT gemini_modelo, gemini_key_cifrada FROM usuarios WHERE id = ?',
      [auth.userId]
    );

    if (rows.length === 0) return errorResponse('Usuário não encontrado', 404);
    const u = rows[0];

    return json({
      modelo: String(u.gemini_modelo || 'gemini-2.5-flash'),
      geminiKeyCifrada: u.gemini_key_cifrada ? String(u.gemini_key_cifrada) : null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(`Erro ao ler configurações: ${msg}`, 500);
  }
}

export async function PATCH(req: Request): Promise<Response> {
  try {
    await initTursoServer();

    const auth = await authenticateRequest(req);
    if (!auth) {
      return errorResponse('Não autorizado', 401);
    }

    const body = (await req.json()) as {
      modelo?: string;
      geminiKeyCifrada?: string | null;
    };

    if (body.modelo === undefined && body.geminiKeyCifrada === undefined) {
      return errorResponse('Pelo menos um campo (modelo ou geminiKeyCifrada) é obrigatório', 400);
    }

    if (body.modelo !== undefined) {
      await execute('UPDATE usuarios SET gemini_modelo = ? WHERE id = ?', [
        body.modelo,
        auth.userId,
      ]);
    }

    if (body.geminiKeyCifrada !== undefined) {
      await execute('UPDATE usuarios SET gemini_key_cifrada = ? WHERE id = ?', [
        body.geminiKeyCifrada,
        auth.userId,
      ]);
    }

    return json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(`Erro ao salvar configurações: ${msg}`, 500);
  }
}

async function handler(req: Request): Promise<Response> {
  if (req.method === 'GET') return GET(req);
  if (req.method === 'PATCH') return PATCH(req);
  return errorResponse('Método não permitido', 405);
}

export default createApiHandler(handler);
