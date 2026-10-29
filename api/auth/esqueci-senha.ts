import { json, errorResponse, createApiHandler } from '../_lib/http';
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
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0c0714; color: #f4f4f5; border-radius: 12px; border: 1px solid #7c3aed;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #c084fc; font-size: 24px; margin: 0;">Lumi</h1>
            <p style="color: #a1a1aa; font-size: 14px; margin: 4px 0 0 0;">Ideias iluminadas por IA</p>
          </div>
          <p style="font-size: 15px; line-height: 1.5; color: #e4e4e7;">Olá <strong>${user.nome}</strong>,</p>
          <p style="font-size: 15px; line-height: 1.5; color: #e4e4e7;">Recebemos uma solicitação para redefinir a senha da sua conta no Lumi.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${link}" style="background-color: #7c3aed; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">Redefinir Minha Senha</a>
          </div>
          <p style="font-size: 13px; line-height: 1.5; color: #a1a1aa;">Se o botão não funcionar, copie e cole este link no seu navegador:<br/><a href="${link}" style="color: #c084fc; word-break: break-all;">${link}</a></p>
          <hr style="border: none; border-top: 1px solid #27272a; margin: 28px 0;" />
          <p style="font-size: 12px; color: #71717a; margin: 0;">Este link é válido por 15 minutos. Se você não solicitou a redefinição, nenhuma ação é necessária.</p>
        </div>
      `,
    });

    return json({ ok: true, mensagem: 'Se o e-mail estiver cadastrado, enviaremos um link de recuperação.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(`Erro ao solicitar recuperação: ${msg}`, 500);
  }
}

async function handler(req: Request): Promise<Response> {
  if (req.method === 'POST') return POST(req);
  return errorResponse('Método não permitido', 405);
}

export default createApiHandler(handler);
