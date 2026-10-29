import { verifySession } from './jwt';

// Helpers de resposta HTTP para as rotas serverless Web API
export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

export function errorResponse(mensagem: string, status = 400): Response {
  return json({ erro: mensagem }, status);
}

export function getBearerToken(req: Request): string | null {
  const auth = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

export async function authenticateRequest(req: Request): Promise<{ userId: number; email: string } | null> {
  const token = getBearerToken(req);
  if (!token) return null;
  return verifySession(token);
}
