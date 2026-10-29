// Utilitários para tokens de recuperação de senha

/// Gera token aleatório URL-safe (hex de 64 chars = 32 bytes)
export function gerarTokenRecuperacao(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/// SHA-256 hash do token (nunca armazenamos token em plaintext)
export async function hashToken(token: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
