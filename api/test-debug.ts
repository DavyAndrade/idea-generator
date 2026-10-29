export default async function handler(req: any, res: any) {
  const results: Record<string, unknown> = {
    ok: true,
    node: process.version,
    hasTursoUrl: Boolean(process.env.TURSO_DATABASE_URL),
    hasTursoToken: Boolean(process.env.TURSO_AUTH_TOKEN),
    hasAuthPepper: Boolean(process.env.AUTH_PEPPER),
    hasJwtSecret: Boolean(process.env.JWT_SECRET),
    envKeysCount: Object.keys(process.env).length,
  };

  // Teste 1: Importar Turso e testar conexão
  try {
    const { query } = await import('./_lib/turso');
    results.tursoImport = 'OK';
    try {
      const rows = await query('SELECT 1 as num');
      results.tursoQuery = rows;
    } catch (e: any) {
      results.tursoQueryError = e.message;
    }
  } catch (e: any) {
    results.tursoImportError = e.message;
  }

  // Teste 2: Importar hash-wasm
  try {
    const { argon2id } = await import('hash-wasm');
    results.hashWasmImport = 'OK';
  } catch (e: any) {
    results.hashWasmImportError = e.message;
  }

  // Teste 3: Importar crypto helper
  try {
    const { getPepper } = await import('./_lib/crypto');
    results.cryptoImport = 'OK';
  } catch (e: any) {
    results.cryptoImportError = e.message;
  }

  res.status(200).json(results);
}
