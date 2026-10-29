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

const RESEND_BASE = 'https://api.resend.com/emails';

// Modo de testes locais: força a exibição do link no terminal/console
// Altere para false quando validar e quiser disparar e-mails reais via Resend
export const FORCAR_CONSOLE_LOCAL = true;

function getApiKey(): string | null {
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

  if (FORCAR_CONSOLE_LOCAL) {
    console.log('\n======================================================');
    console.log('📬 [LUMI - RECUPERAÇÃO DE SENHA (MODO TESTE LOCAL)]');
    console.log(`👤 Para: ${recipient.email} <${recipient.nome}>`);
    console.log(`📋 Assunto: ${recipient.subject}`);
    if (link) {
      console.log(`🔗 LINK DE RECUPERAÇÃO:\n   ${link}`);
    }
    console.log('======================================================\n');
    return { ok: true, mensagem: 'Link de recuperação logado no console (modo teste local ativo).' };
  }

  const apiKey = getApiKey();

  if (!apiKey) {
    console.log(`[RESEND dev] Para: ${recipient.email} <${recipient.nome}>`);
    console.log(`[RESEND dev] Link: ${link}`);
    return { ok: true, mensagem: 'Email logado no console (sem RESEND_API_KEY)' };
  }

  const payload: ResendEmail = {
    from: process.env.RESEND_FROM || 'noreply@lumi.app',
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
    return {
      ok: false,
      mensagem: data.error || `Resend error: ${res.status} ${res.statusText}`,
    };
  }

  return {
    ok: true,
    id: data.id,
    mensagem: 'Email enviado com sucesso',
  };
}
