import { json, errorResponse, createApiHandler } from '../_lib/http';
import { query, initTursoServer } from '../_lib/turso';
import { gerarSaltHex, derivarArgon2idPHC } from '../_lib/crypto';
import { signSession } from '../_lib/jwt';

export async function POST(req: Request): Promise<Response> {
  try {
    await initTursoServer();

    const body = (await req.json()) as { nome?: string; email?: string; senha?: string };
    const nome = body.nome?.trim();
    const email = body.email?.trim().toLowerCase();
    const senha = body.senha;

    if (!nome) return errorResponse('Nome é obrigatório');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse('E-mail inválido');
    }
    if (!senha || senha.length < 8) {
      return errorResponse('A senha deve ter no mínimo 8 caracteres');
    }
    if (!/[A-Z]/.test(senha) || !/[a-z]/.test(senha) || !/[0-9]/.test(senha) || !/[^A-Za-z0-9]/.test(senha)) {
      return errorResponse('A senha não cumpre os requisitos de segurança');
    }

    // Verifica se email já existe
    const existente = await query<Record<string, unknown>>(
      'SELECT id FROM usuarios WHERE email = ?',
      [email]
    );
    if (existente.length > 0) {
      return errorResponse('Este e-mail já está em uso', 409);
    }

    const saltHex = gerarSaltHex();
    const credencialHash = await derivarArgon2idPHC(senha, saltHex);
    const criadoEm = new Date().toISOString();

    const rows = await query<Record<string, unknown>>(
      `INSERT INTO usuarios (nome, email, credencial_hash, gemini_key_cifrada, gemini_modelo, criado_em)
       VALUES (?, ?, ?, ?, ?, ?)
       RETURNING id, nome, email, gemini_modelo`,
      [nome, email, credencialHash, null, 'gemini-2.5-flash', criadoEm]
    );

    const user = rows[0];
    const userId = Number(user.id);
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
    }, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(`Erro no registro: ${msg}`, 500);
  }
}

async function handler(req: Request): Promise<Response> {
  if (req.method === 'POST') return POST(req);
  return errorResponse('Método não permitido', 405);
}

export default createApiHandler(handler);
