// Cliente REST para envio de emails via Resend (https://api.resend.com/emails)
// Zero dependências — usa fetch nativo

interface ResendEmail {
  from: string;
  to: string;
  subject: string;
  html: string;
}

interface ResendResponse {
  id?: string;
  error?: string;
}

import { ensureEnv } from './turso';

const RESEND_BASE = 'https://api.resend.com/emails';

function getApiKey(): string | null {
  ensureEnv();
  return (
    process.env.RESEND_API_KEY ||
    process.env.RESEND_KEY ||
    null
  );
}

export async function enviarEmail(recipient: {
  email: string;
  nome: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; id?: string; mensagem: string }> {
  // Extrai o link de redefinição para exibição limpa no terminal
  const linkMatch = recipient.html.match(/href="([^"]+)"/);
  const link = linkMatch ? linkMatch[1] : '';

  // Sempre imprime o link com destaque no terminal dev para facilidade de teste local
  console.log('\n======================================================');
  console.log('📬 [LUMI - RECUPERAÇÃO DE SENHA]');
  console.log(`👤 Para: ${recipient.email} <${recipient.nome}>`);
  console.log(`📋 Assunto: ${recipient.subject}`);
  if (link) {
    console.log(`🔗 LINK DE RECUPERAÇÃO:\n   ${link}`);
  }
  console.log('======================================================\n');

  const apiKey = getApiKey();

  if (!apiKey) {
    return { ok: true, mensagem: 'Link de recuperação logado no console (sem RESEND_API_KEY no servidor)' };
  }

  // Padrão do Resend: onboarding@resend.dev é aceito sem precisar de domínio customizado
  const fromEmail = process.env.RESEND_FROM || 'Lumi <onboarding@resend.dev>';

  try {
    const payload: ResendEmail = {
      from: fromEmail,
      to: recipient.email,
      subject: recipient.subject,
      html: recipient.html,
    };

    const res = await fetch(RESEND_BASE, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as ResendResponse;

    if (!res.ok) {
      console.error('[RESEND ERRO]', data);
      return {
        ok: false,
        mensagem: data.error || `Erro Resend (${res.status})`,
      };
    }

    console.log(`✅ [RESEND] E-mail enviado com sucesso! ID: ${data.id}`);
    return {
      ok: true,
      id: data.id,
      mensagem: 'Email enviado com sucesso',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[RESEND EXCEPTION]', msg);
    return { ok: false, mensagem: msg };
  }
}
