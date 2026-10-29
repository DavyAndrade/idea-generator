import { json, errorResponse } from '../_lib/http';
import { query, execute, initTursoServer } from '../_lib/turso';
import { enviarEmail } from '../_lib/resend';
import { gerarSaltHex } from '../_lib/crypto';
import { gerarTokenRecuperacao, hashToken } from '../_lib/tokens';

export async function POST(req: Request): Promise<Response> {
  try {
    await initTursoServer();

    const body = (await req.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse('E-mail inválido', 400);
    }

    // Busca usuário (mesmo se nao existir, retorna 200 para nao vazar existencia)
    const rows = await query<Record<string, unknown>>(
      'SELECT id, nome, email FROM usuarios WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      // Resposta genérica — nao revela se o email existe
      return json({ ok: true, mensagem: 'Se o e-mail estiver cadastrado, enviaremos um link de recuperação.' });
    }

    const user = rows[0];
    const userId = Number(user.id);

    // Invalida tokens anteriores nao usados
    await execute(
      'UPDATE tokens_recuperacao SET usado = 1 WHERE usuario_id = ? AND usado = 0',
      [userId]
    );

    // Gera token + salt (salt sera usado pelo cliente para derivar vaultKey da nova senha)
    const token = gerarTokenRecuperacao();
    const tokenHash = await hashToken(token);
    const saltHex = gerarSaltHex();
    const criadoEm = new Date().toISOString();
    const expiraEm = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

    await execute(
      `INSERT INTO tokens_recuperacao (usuario_id, token_hash, expira_em, criado_em)
       VALUES (?, ?, ?, ?)`,
      [userId, tokenHash, expiraEm, criadoEm]
    );

    // URL de recuperacao (token + salt como params na raiz do app)
    const baseUrl = process.env.APP_URL || process.env.RECOVERY_BASE_URL || 'http://localhost:5173';
    const link = `${baseUrl.replace(/\/$/, '')}/?token=${token}&saltHex=${saltHex}`;

    // Envia email
    await enviarEmail({
      email: String(user.email),
      nome: String(user.nome),
      subject: 'Recuperação de senha — Lumi',
      html: `
        <p>Olá ${user.nome},</p>
        <p>Recebemos uma solicitação de recuperação de senha.</p>
        <p>Clique no link abaixo para redefinir sua senha (válido por 15 minutos):</p>
        <p><a href="${link}">Redefinir senha</a></p>
        <p>Se não solicitou, ignore este e-mail.</p>
        <p>Equipe Lumi</p>
      `,
    });

    return json({ ok: true, mensagem: 'Se o e-mail estiver cadastrado, enviaremos um link de recuperação.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(`Erro ao solicitar recuperação: ${msg}`, 500);
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'POST') return POST(req);
  return errorResponse('Método não permitido', 405);
}
