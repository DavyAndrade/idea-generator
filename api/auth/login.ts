import { json, errorResponse } from '../_lib/http';
import { query, initTursoServer } from '../_lib/turso';
import { aplicarPepper, verificarArgon2id, extrairSaltDePHC } from '../_lib/crypto';
import { signSession } from '../_lib/jwt';

export async function POST(req: Request): Promise<Response> {
  try {
    await initTursoServer();

    const body = (await req.json()) as { email?: string; senha?: string };
    const email = body.email?.trim().toLowerCase();
    const senha = body.senha;

    if (!email || !senha) {
      return errorResponse('E-mail e senha são obrigatórios', 400);
    }

    const rows = await query<Record<string, unknown>>(
      'SELECT id, nome, email, credencial_hash, gemini_key_cifrada, gemini_modelo FROM usuarios WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return errorResponse('E-mail ou senha inválidos', 401);
    }

    const user = rows[0];
    const credHash = String(user.credencial_hash);
    const senhaPeppered = await aplicarPepper(senha);

    const ok = await verificarArgon2id(senhaPeppered, credHash);
    if (!ok) {
      return errorResponse('E-mail ou senha inválidos', 401);
    }

    const userId = Number(user.id);
    const saltHex = extrairSaltDePHC(credHash);
    const token = await signSession({ userId, email });

    return json({
      token,
      user: {
        id: userId,
        nome: String(user.nome),
        email: String(user.email),
        geminiModelo: String(user.gemini_modelo),
      },
      saltHex,
      geminiKeyCifrada: user.gemini_key_cifrada ? String(user.gemini_key_cifrada) : null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(`Erro no login: ${msg}`, 500);
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'POST') return POST(req);
  return errorResponse('Método não permitido', 405);
}
