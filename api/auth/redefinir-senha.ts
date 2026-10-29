import { json, errorResponse } from '../_lib/http';
import { query, execute, initTursoServer } from '../_lib/turso';
import { hashToken } from '../_lib/tokens';

export async function POST(req: Request): Promise<Response> {
  try {
    await initTursoServer();

    const body = (await req.json()) as {
      token?: string;
      credencialHash?: string;
      saltHex?: string;
    };

    const token = body.token?.trim();
    const credencialHash = body.credencialHash?.trim();
    const saltHex = body.saltHex?.trim();

    if (!token) {
      return errorResponse('Token inválido', 400);
    }

    if (!credencialHash || !credencialHash.startsWith('$argon2')) {
      return errorResponse('Hash de credencial inválido', 400);
    }

    if (!saltHex || saltHex.length !== 32) {
      return errorResponse('Salt inválido', 400);
    }

    // Busca token nao usado e valido
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
    const tokenId = Number(entry.id);
    const userId = Number(entry.usuario_id);

    if (Number(entry.usado) === 1) {
      return errorResponse('Token já utilizado', 400);
    }

    const expiraEm = String(entry.expira_em);
    if (new Date(expiraEm).getTime() < Date.now()) {
      return errorResponse('Token expirado', 400);
    }

    // Atualiza a senha (credencial_hash PHC) do usuario
    await execute(
      'UPDATE usuarios SET credencial_hash = ? WHERE id = ?',
      [credencialHash, userId]
    );

    // Marca token como usado
    await execute(
      'UPDATE tokens_recuperacao SET usado = 1 WHERE id = ?',
      [tokenId]
    );

    return json({ ok: true, mensagem: 'Senha redefinida com sucesso' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(`Erro ao redefinir senha: ${msg}`, 500);
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'POST') return POST(req);
  return errorResponse('Método não permitido', 405);
}
