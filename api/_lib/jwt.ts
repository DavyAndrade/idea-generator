// Gerenciamento de tokens de sessão seguros via HMAC-SHA256 com Web Crypto nativo (Zero dependências)
import { ensureEnv } from './turso';

interface SessionPayload {
  userId: number;
  email: string;
  exp: number; // timestamp em segundos
}

function getJwtSecret(): string {
  ensureEnv();
  const secret =
    process.env.JWT_SECRET ||
    process.env.AUTH_PEPPER ||
    process.env.VITE_AUTH_PEPPER ||
    'lumi-dev-jwt-secret-session-2026';
  return secret;
}

function toBase64Url(buf: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buf.length; i++) {
    binary += String.fromCharCode(buf[i]);
  }
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + ((4 - (str.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/// Gera um token de sessão assinado (válido por 30 dias)
export async function signSession(payload: { userId: number; email: string }): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 dias
  const header = { alg: 'HS256', typ: 'JWT' };
  const fullPayload: SessionPayload = { ...payload, exp };

  const encHeader = toBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const encPayload = toBase64Url(new TextEncoder().encode(JSON.stringify(fullPayload)));
  const dataToSign = `${encHeader}.${encPayload}`;

  const key = await getHmacKey(getJwtSecret());
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(dataToSign));
  const encSig = toBase64Url(new Uint8Array(sig));

  return `${dataToSign}.${encSig}`;
}

/// Valida um token de sessão e retorna o payload ou null se inválido/expirado
export async function verifySession(token: string): Promise<{ userId: number; email: string } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encHeader, encPayload, encSig] = parts;
    const dataToSign = `${encHeader}.${encPayload}`;

    const key = await getHmacKey(getJwtSecret());
    const signature = fromBase64Url(encSig);

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      new TextEncoder().encode(dataToSign)
    );

    if (!valid) return null;

    const payloadJson = new TextDecoder().decode(fromBase64Url(encPayload));
    const payload = JSON.parse(payloadJson) as SessionPayload;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Token expirado
    }

    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}
