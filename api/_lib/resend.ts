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
  const apiKey = getApiKey();

  if (!apiKey) {
    // Modo desenvolvimento: log do link para testes locais
    console.log(`[RESEND dev] Para: ${recipient.email} <${recipient.nome}>`);
    console.log(`[RESEND dev] Assunto: ${recipient.subject}`);
    console.log(`[RESEND dev] HTML: ${recipient.html}`);
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
