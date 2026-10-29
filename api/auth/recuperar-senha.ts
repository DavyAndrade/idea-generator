import { json, errorResponse } from '../_lib/http';
import { query, execute, initTursoServer } from '../_lib/turso';
import { gerarRecoveryCode, aplicarPepper } from '../_lib/crypto';
import { createHash } from 'node:crypto';

// Resend API integration
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM = process.env.RESEND_FROM || 'noreply@lumi.app';

async function enviarEmailRecuperacao(email: string, recoveryCode: string): Promise<void> {
  if (!RESEND_API_KEY) {
    // Modo desenvolvimento: loga o código no console
    console.log(`[DEV] Código de recuperação para ${email}: ${recoveryCode}`);
    return;
  }

  const url = 'https://api.resend.com/emails';
  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [email],
      subject: 'Recuperação de senha Lumi',
      html: `
        <p>Olá,</p>
        <p>Seu código de recuperação de senha Lumi:</p>
        <p><strong>${recoveryCode}</strong></p>
        <p>Cole este código na tela de redefinição de senha.</p>
        <p>Este código expira em 1 hora.</p>
      `,
    }),
  });
}

// Cria hash do recovery code para validação server-side (não armazena o código em texto)
async function hashRecoveryCode(recoveryCode: string): Promise<string> {
  const senhaPeppered = await aplicarPepper(recoveryCode);
  // Usa SHA-256 do peppered code como hash simples (o código é one-time, não precisa de Argon2)
  const hash = createHash('sha256').update(Buffer.from(senhaPeppered)).digest('hex');
  return hash;
}

export async function POST(req: Request): Promise<Response> {
  try {
    await initTursoServer();

    const body = (await req.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse('E-mail inválido', 400);
    }

    // Verifica se o email existe
    const rows = await query<Record<string, unknown>>(
      'SELECT id FROM usuarios WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      // Retorna sucesso mesmo se o email não existir (não revela usuário existente)
      return json({ ok: true });
    }

    // Gera código de recuperação e hash
    const recoveryCode = await gerarRecoveryCode();
    const recoveryCodeHash = await hashRecoveryCode(recoveryCode);

    // Armazena o hash do código (nunca o código em texto)
    await execute(
      'UPDATE usuarios SET recovery_code_hash = ? WHERE email = ?',
      [recoveryCodeHash, email]
    );

    // Envia e-mail via Resend
    await enviarEmailRecuperacao(email, recoveryCode);

    return json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(`Erro ao solicitar recuperação: ${msg}`, 500);
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'POST') return POST(req);
  return errorResponse('Método não permitido', 405);
}
