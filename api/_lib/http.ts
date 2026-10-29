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

// Converte IncomingMessage / VercelRequest do runtime Node.js em um Web Standard Request
export async function nodeToWebRequest(req: any): Promise<Request> {
  if (req instanceof Request) return req;
  if (typeof req.json === 'function' && typeof req.headers?.get === 'function') {
    return req as Request;
  }

  const protocol = req.headers?.['x-forwarded-proto'] || 'https';
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host || 'localhost';
  const url = new URL(req.url || '/', `${protocol}://${host}`).toString();

  const headers = new Headers();
  if (req.headers) {
    for (const [key, val] of Object.entries(req.headers)) {
      if (val !== undefined && val !== null) {
        headers.set(key, Array.isArray(val) ? val.join(', ') : String(val));
      }
    }
  }

  const method = (req.method || 'GET').toUpperCase();
  let body: BodyInit | undefined = undefined;

  if (method !== 'GET' && method !== 'HEAD') {
    if (req.body !== undefined && req.body !== null) {
      if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
        body = JSON.stringify(req.body);
      } else if (Buffer.isBuffer(req.body)) {
        body = req.body;
      } else if (typeof req.body === 'string') {
        body = req.body;
      }
    } else if (typeof req[Symbol.asyncIterator] === 'function') {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      if (chunks.length > 0) {
        body = Buffer.concat(chunks);
      }
    }
  }

  return new Request(url, {
    method,
    headers,
    body,
  });
}

// Adaptador universal para Vercel Serverless Functions:
// Detecta se está sendo chamado como Node.js handler (req, res) na Vercel ou como Web API pura
export function createApiHandler(
  handler: (req: Request) => Promise<Response>
) {
  return async function (req: any, res?: any): Promise<Response | void> {
    // Caso Vercel Serverless Node.js (res fornecido com métodos de resposta)
    if (res && (typeof res.status === 'function' || typeof res.writeHead === 'function' || typeof res.end === 'function')) {
      try {
        const webReq = await nodeToWebRequest(req);
        const webRes = await handler(webReq);

        const status = webRes.status || 200;
        if (typeof res.status === 'function') {
          res.status(status);
        } else {
          res.statusCode = status;
        }

        webRes.headers.forEach((val, key) => {
          if (typeof res.setHeader === 'function') {
            res.setHeader(key, val);
          }
        });

        const arrayBuf = await webRes.arrayBuffer();
        res.end(Buffer.from(arrayBuf));
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('Erro na API Serverless (Vercel):', err);
        const status = 500;
        if (typeof res.status === 'function') {
          res.status(status).json({ erro: `Erro interno no servidor: ${msg}` });
        } else {
          res.statusCode = status;
          if (typeof res.setHeader === 'function') {
            res.setHeader('Content-Type', 'application/json');
          }
          res.end(JSON.stringify({ erro: `Erro interno no servidor: ${msg}` }));
        }
        return;
      }
    }

    // Caso Web API padrão (Request -> Response)
    return handler(req as Request);
  };
}
