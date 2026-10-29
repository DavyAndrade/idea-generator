// Zero-Knowledge Auth + AES-256-GCM vault
// - gerarSaltHex: salt aleatório hex para Argon2id
// - derivarChaves: Argon2id (via hash-wasm) + Pepper (HMAC-SHA256) → PHC string + vaultKeyHex (64 chars)
// - cifrarTexto/decifrarTexto: AES-256-GCM com IV aleatório por operação
// - constantTimeEquals: comparação que não vaza timing
// Web Crypto API + hash-wasm — usa PHC oficial para authHash, vaultKeyHex opaco
import { argon2id, argon2Verify } from "hash-wasm";

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

/// Aplica Pepper via HMAC-SHA256 sobre a senha antes do derive.
/// Le o pepper do parâmetro, VITE_AUTH_PEPPER ou fallback padrão.
export async function aplicarPepper(senha: string, pepper?: string): Promise<Uint8Array> {
  let pepperKey: string | undefined = pepper;
  if (!pepperKey && typeof import.meta !== "undefined") {
    pepperKey = (import.meta.env as Record<string, string | undefined> | undefined)?.VITE_AUTH_PEPPER;
  }
  if (!pepperKey) pepperKey = "lumi-default-pepper-v1";

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pepperKey!),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const assinatura = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(senha));
  return new Uint8Array(assinatura);
}

/// Verifica senha peppered contra um hash PHC Argon2id.
export async function verificarArgon2id(senhaPeppered: Uint8Array, phcHash: string): Promise<boolean> {
  return argon2Verify({ password: senhaPeppered, hash: phcHash });
}

/// Extrai o salt em hex do formato PHC $argon2id$v=19$m=...$<salt_b64>$<hash_b64>
/// Decodifica o base64 do 4o campo (sem padding) para hex.
export function extrairSaltDePHC(phc: string): string {
  const parts = phc.split("$");
  // Formato esperado: $argon2id$v=19$m=...,t=...,p=...$<salt_b64>$<hash_b64>
  // parts[0]="" (vazio antes do primeiro $), parts[1]="argon2id", parts[2]="v=19...", parts[3]=params, parts[4]=salt_b64, parts[5]=hash_b64
  const saltB64 = parts[4];
  if (!saltB64) throw new Error("PHC inválido: salt não encontrado");
  // Normaliza base64url e adiciona padding se necessário
  const cleanB64 = saltB64.replace(/_/g, "/").replace(/-/g, "+");
  const padded = cleanB64.padEnd(cleanB64.length + ((4 - (cleanB64.length % 4)) % 4), "=");
  const b64decoded = atob(padded);
  const bytes = new Uint8Array(b64decoded.length);
  for (let i = 0; i < b64decoded.length; i++) {
    bytes[i] = b64decoded.charCodeAt(i);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/// Deriva hash opaco legado (64 hex chars, sem prefixo PHC) para compat com hashes antigos.
export async function derivarHashLegado(
  senha: string,
  saltHex: string,
  pepper?: string,
): Promise<string> {
  const senhaPeppered = await aplicarPepper(senha, pepper);
  const salt = hexToBuf(saltHex);
  const hex = await argon2id({
    password: senhaPeppered,
    salt,
    parallelism: 1,
    iterations: 3,
    memorySize: 19456,
    hashLength: 64,
    outputType: "hex",
  });
  return hex.slice(0, 64);
}

/// Deriva duas chaves distintas via Argon2id (com Pepper HMAC-SHA256):
/// - authHashHex: string PHC oficial $argon2id$v=19$m=19456,t=3,p=1$... para autenticação
/// - vaultKeyHex: chave de 64 hex chars (256 bits) para criptografia AES
export async function derivarChaves(
  senha: string,
  saltHex: string,
  pepper?: string,
): Promise<ChavesDerivadas> {
  const senhaPeppered = await aplicarPepper(senha, pepper);
  const salt = hexToBuf(saltHex);

  // PHC oficial para verificação no login
  const phc = await argon2id({
    password: senhaPeppered,
    salt,
    parallelism: 1,
    iterations: 3,
    memorySize: 19456,
    hashLength: 32,
    outputType: "encoded",
  });

  // 64 hex chars opacos para chave AES-256-GCM
  const vaultKeyHex = await argon2id({
    password: senhaPeppered,
    salt,
    parallelism: 1,
    iterations: 3,
    memorySize: 19456,
    hashLength: 32,
    outputType: "hex",
  });

  return {
    authHashHex: phc,
    vaultKeyHex,
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
