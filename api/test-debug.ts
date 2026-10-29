import fs from 'node:fs';
import path from 'node:path';

export default async function handler(req: any, res: any) {
  const results: Record<string, unknown> = {
    ok: true,
    cwd: process.cwd(),
  };

  // Lista os arquivos em /var/task e /var/task/api
  try {
    results.taskFiles = fs.readdirSync(process.cwd());
  } catch (e: any) {
    results.taskFilesError = e.message;
  }

  try {
    results.apiFiles = fs.readdirSync(path.join(process.cwd(), 'api'));
  } catch (e: any) {
    results.apiFilesError = e.message;
  }

  // Verifica se a pasta _lib existe e lista seu conteúdo
  try {
    const libPath = path.join(process.cwd(), 'api', '_lib');
    results.libExists = fs.existsSync(libPath);
    if (results.libExists) {
      results.libFiles = fs.readdirSync(libPath);
    }
  } catch (e: any) {
    results.libError = e.message;
  }

  // Teste de import com extensão .js
  try {
    const turso = await import('./_lib/turso.js');
    results.importTursoJs = 'OK';
    const rows = await turso.query('SELECT 1 as num');
    results.tursoQuery = rows;
  } catch (e: any) {
    results.importTursoJsError = e.message;
  }

  res.status(200).json(results);
}
