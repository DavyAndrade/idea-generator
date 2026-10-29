import { argon2id, argon2Verify } from 'hash-wasm';

const SALT_BYTES = 16;

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function getPepper(): string {
  return (
    process.env.AUTH_PEPPER ||
    process.env.VITE_AUTH_PEPPER ||
    'lumi-default-pepper-v1'
  );
}

export function gerarSaltHex(): string {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  return bufToHex(salt.buffer as ArrayBuffer);
}

export async function aplicarPepper(senha: string, pepper?: string): Promise<Uint8Array> {
  const pepperKey = pepper || getPepper();
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pepperKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(senha));
  return new Uint8Array(sig);
}

export async function derivarArgon2idPHC(senha: string, saltHex: string, pepper?: string): Promise<string> {
  const senhaPeppered = await aplicarPepper(senha, pepper);
  const salt = hexToBuf(saltHex);
  return argon2id({
    password: senhaPeppered,
    salt,
    parallelism: 1,
    iterations: 3,
    memorySize: 19456,
    hashLength: 32,
    outputType: 'encoded',
  });
}

export async function verificarArgon2id(senhaPeppered: Uint8Array, phcHash: string): Promise<boolean> {
  return argon2Verify({ password: senhaPeppered, hash: phcHash });
}

export function extrairSaltDePHC(phc: string): string {
  const parts = phc.split('$');
  const saltB64 = parts[4];
  if (!saltB64) throw new Error('PHC inválido: salt não encontrado');
  const cleanB64 = saltB64.replace(/_/g, '/').replace(/-/g, '+');
  const padded = cleanB64.padEnd(cleanB64.length + ((4 - (cleanB64.length % 4)) % 4), '=');
  const b64decoded = atob(padded);
  const bytes = new Uint8Array(b64decoded.length);
  for (let i = 0; i < b64decoded.length; i++) {
    bytes[i] = b64decoded.charCodeAt(i);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
