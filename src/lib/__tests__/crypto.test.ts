import { describe, expect, it } from 'vitest';
import {
  gerarSaltHex,
  derivarChaves,
  extrairSaltDePHC,
  cifrarTexto,
  decifrarTexto,
  constantTimeEquals,
  verificarArgon2id,
} from '@/lib/crypto';

describe('crypto — Zero-Knowledge Auth + AES-256-GCM vault', () => {
  const SENHA = 'minha-senha-secreta';

  describe('gerarSaltHex', () => {
    it('produz hex string de 32 chars (16 bytes)', async () => {
      const salt = await gerarSaltHex();
      expect(salt).toMatch(/^[0-9a-f]{32}$/);
    });

    it('produz salts diferentes a cada chamada', async () => {
      const a = await gerarSaltHex();
      const b = await gerarSaltHex();
      expect(a).not.toBe(b);
    });
  });

  describe('derivarChaves', () => {
    it('produz authHashHex no formato PHC canonico $argon2id$v=19$m=19456,t=3,p=1$', async () => {
      const salt = await gerarSaltHex();
      const { authHashHex, vaultKeyHex } = await derivarChaves(SENHA, salt);
      expect(authHashHex).toMatch(/^\$argon2id\$v=19\$m=19456,t=3,p=1\$/);
      expect(vaultKeyHex).toMatch(/^[0-9a-f]{64}$/);
    });

    it('authHashHex !== vaultKeyHex', async () => {
      const salt = await gerarSaltHex();
      const { authHashHex, vaultKeyHex } = await derivarChaves(SENHA, salt);
      expect(authHashHex).not.toBe(vaultKeyHex);
    });

    it('produz chaves determinísticas para mesma senha+salt+pepper', async () => {
      const salt = await gerarSaltHex();
      const a = await derivarChaves(SENHA, salt, 'pepper-X');
      const b = await derivarChaves(SENHA, salt, 'pepper-X');
      expect(a.authHashHex).toBe(b.authHashHex);
      expect(a.vaultKeyHex).toBe(b.vaultKeyHex);
    });

    it('produz chaves diferentes para senha ou salt distintos', async () => {
      const salt = await gerarSaltHex();
      const a = await derivarChaves(SENHA, salt);
      const b = await derivarChaves('outra-senha', salt);
      const c = await derivarChaves(SENHA, await gerarSaltHex());
      expect(a.authHashHex).not.toBe(b.authHashHex);
      expect(a.vaultKeyHex).not.toBe(c.vaultKeyHex);
    });

    it('pepper diferente produz authHashHex e vaultKeyHex diferentes', async () => {
      const salt = await gerarSaltHex();
      const a = await derivarChaves(SENHA, salt, 'pepper-A');
      const b = await derivarChaves(SENHA, salt, 'pepper-B');
      expect(a.authHashHex).not.toBe(b.authHashHex);
      expect(a.vaultKeyHex).not.toBe(b.vaultKeyHex);
    });

    it('pepper undefined = pepper padrão (ainda funciona)', async () => {
      const salt = await gerarSaltHex();
      const { authHashHex, vaultKeyHex } = await derivarChaves(SENHA, salt);
      expect(authHashHex).toMatch(/^\$argon2id\$/);
      expect(vaultKeyHex).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('extrairSaltDePHC', () => {
    it('extrai exatamente o salt original do hash PHC', async () => {
      const saltOriginal = await gerarSaltHex();
      const { authHashHex } = await derivarChaves(SENHA, saltOriginal);
      const saltExtraido = extrairSaltDePHC(authHashHex);
      expect(saltExtraido).toBe(saltOriginal);
    });

    it('lança erro para string PHC inválida sem salt', () => {
      expect(() => extrairSaltDePHC('invalido')).toThrow('PHC inválido: salt não encontrado');
    });
  });

  describe('verificarArgon2id', () => {
    // Replica a lógica interna de aplicarPepper (HMAC-SHA256) para obter senhaPeppered
    async function pepperSenha(senha: string, pepper: string): Promise<Uint8Array> {
      const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(pepper),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
      );
      const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(senha));
      return new Uint8Array(sig);
    }

    const PEPPER_TESTE = 'pepper-test';

    it('retorna true para a senha peppered correta', async () => {
      const salt = await gerarSaltHex();
      const { authHashHex } = await derivarChaves(SENHA, salt, PEPPER_TESTE);
      const senhaPeppered = await pepperSenha(SENHA, PEPPER_TESTE);
      expect(await verificarArgon2id(senhaPeppered, authHashHex)).toBe(true);
    });

    it('retorna false para senha errada', async () => {
      const salt = await gerarSaltHex();
      const { authHashHex } = await derivarChaves(SENHA, salt, PEPPER_TESTE);
      const senhaPepperedErrada = await pepperSenha('senha-errada', PEPPER_TESTE);
      expect(await verificarArgon2id(senhaPepperedErrada, authHashHex)).toBe(false);
    });

    it('retorna false para pepper diferente', async () => {
      const salt = await gerarSaltHex();
      const { authHashHex } = await derivarChaves(SENHA, salt, 'pepper-A');
      const senhaPeppered = await pepperSenha(SENHA, 'pepper-B');
      expect(await verificarArgon2id(senhaPeppered, authHashHex)).toBe(false);
    });
  });

  describe('cifrarTexto + decifrarTexto', () => {
    it('decifra recupera o texto original', async () => {
      const salt = await gerarSaltHex();
      const { vaultKeyHex } = await derivarChaves(SENHA, salt);
      const texto = 'chave-gemini-api-12345';
      const cipher = await cifrarTexto(texto, vaultKeyHex);
      const decifrado = await decifrarTexto(cipher, vaultKeyHex);
      expect(decifrado).toBe(texto);
    });

    it('produz ciphertext diferente a cada chamada (IV aleatório)', async () => {
      const salt = await gerarSaltHex();
      const { vaultKeyHex } = await derivarChaves(SENHA, salt);
      const texto = 'dados-sensiveis';
      const a = await cifrarTexto(texto, vaultKeyHex);
      const b = await cifrarTexto(texto, vaultKeyHex);
      expect(a).not.toBe(b);
    });

    it('chave errada falha ao decifrar', async () => {
      const salt = await gerarSaltHex();
      const { vaultKeyHex } = await derivarChaves(SENHA, salt);
      const texto = 'texto-protegido';
      const cipher = await cifrarTexto(texto, vaultKeyHex);
      const { vaultKeyHex: chaveErrada } = await derivarChaves('senha-errada', salt);
      await expect(decifrarTexto(cipher, chaveErrada)).rejects.toThrow();
    });

    it('text vazio retorna ""', async () => {
      const salt = await gerarSaltHex();
      const { vaultKeyHex } = await derivarChaves(SENHA, salt);
      expect(await cifrarTexto('', vaultKeyHex)).toBe('');
      expect(await decifrarTexto('', vaultKeyHex)).toBe('');
    });

    it('ciphertext hex válido com IV prefixado (12 bytes = 24 hex chars)', async () => {
      const salt = await gerarSaltHex();
      const { vaultKeyHex } = await derivarChaves(SENHA, salt);
      const cipher = await cifrarTexto('teste', vaultKeyHex);
      expect(cipher).toMatch(/^[0-9a-f]{24}/);
      expect(cipher.length).toBeGreaterThan(24);
    });
  });

  describe('constantTimeEquals', () => {
    it('retorna true para strings iguais', () => {
      expect(constantTimeEquals('abc123', 'abc123')).toBe(true);
    });

    it('retorna false para strings diferentes', () => {
      expect(constantTimeEquals('abc123', 'abc456')).toBe(false);
    });

    it('retorna false para tamanhos diferentes', () => {
      expect(constantTimeEquals('abc', 'abcd')).toBe(false);
    });
  });
});
