// Zero-Knowledge Auth + AES-256-GCM vault
// - gerarSaltHex: salt aleatório hex para PBKDF2
// - derivarChaves: PBKDF2-SHA256 → authHashHex (64 chars) + vaultKeyHex (64 chars)
// - cifrarTexto/decifrarTexto: AES-256-GCM com IV aleatório por operação
// - constantTimeEquals: comparação que não vaza timing
// Web Crypto API — nunca expõe o algoritmo no hash (formato opaco)

const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BYTES = 32; // 256 bits
const IV_BYTES = 12; // GCM recomendado

function bufToHex(buf: ArrayBufferLike): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuf(hex: string): Uint8Array {
  const len = hex.length / 2;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return arr;
}

/// Gera um salt aleatório de 16 bytes codificado em hex.
export async function gerarSaltHex(): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  return bufToHex(salt.buffer as ArrayBuffer);
}

interface ChavesDerivadas {
  authHashHex: string;
  vaultKeyHex: string;
}

/// Deriva duas chaves distintas via PBKDF2-SHA256:
/// - authHashHex: hash opaco de 64 hex chars (256 bits) para autenticação
/// - vaultKeyHex: chave de 64 hex chars (256 bits) para criptografia AES
export async function derivarChaves(
  senha: string,
  saltHex: string,
): Promise<ChavesDerivadas> {
  const salt = hexToBuf(saltHex);
  const senhaBuf = new TextEncoder().encode(senha);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    senhaBuf,
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );

  // Derive 512 bits: primeiros 256 → authHash, próximos 256 → vaultKey
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    512,
  );

  const bytes = new Uint8Array(bits);
  const authBytes = bytes.slice(0, KEY_BYTES);
  const vaultBytes = bytes.slice(KEY_BYTES, KEY_BYTES * 2);

  return {
    authHashHex: bufToHex(authBytes.buffer),
    vaultKeyHex: bufToHex(vaultBytes.buffer),
  };
}

/// Cifra texto usando AES-256-GCM com IV aleatório.
/// Retorna hex: iv + ciphertext + tag (formato único por chamada).
/// String vazia retorna '' (sem IV, sem ciphertext).
export async function cifrarTexto(
  texto: string,
  chaveHex: string,
): Promise<string> {
  if (texto === '') return '';
  const keyBytes = hexToBuf(chaveHex);
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes as unknown as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  );

  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const textoBuf = new TextEncoder().encode(texto);

  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    textoBuf,
  );

  // Concatena IV + ciphertext para decifrar depois
  const combined = new Uint8Array(iv.byteLength + cipherBuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuf), iv.byteLength);

  return bufToHex(combined.buffer as ArrayBuffer);
}

/// Decifra texto cifrado com cifrarTexto usando AES-256-GCM.
export async function decifrarTexto(
  ciphertextHex: string,
  chaveHex: string,
): Promise<string> {
  if (ciphertextHex === '') return '';
  const combined = hexToBuf(ciphertextHex);
  const iv = combined.slice(0, IV_BYTES);
  const cipherBytes = combined.slice(IV_BYTES);

  const keyBytes = hexToBuf(chaveHex);
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes as unknown as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  );

  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    cipherBytes as BufferSource,
  );

  return new TextDecoder().decode(plainBuf);
}

/// Comparação de igualdade em tempo constante (evita timing attacks).
export function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
