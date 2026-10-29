import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

const ROUTE_MAP: Record<string, () => Promise<{ default?: (req: Request) => Promise<Response>; [key: string]: unknown }>> = {
  '/api/auth/registrar': () => import('./api/auth/registrar'),
  '/api/auth/login': () => import('./api/auth/login'),
  '/api/auth/sessao': () => import('./api/auth/sessao'),
  '/api/ideias': () => import('./api/ideias/index'),
  '/api/usuario/perfil': () => import('./api/usuario/perfil'),
  '/api/usuario/config': () => import('./api/usuario/config'),
};

export function serverlessDevPlugin(): Plugin {
  return {
    name: 'serverless-dev-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (!req.url || !req.url.startsWith('/api/')) {
          return next();
        }

        try {
          const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
          const loader = ROUTE_MAP[parsedUrl.pathname];

          if (!loader) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ erro: 'Rota não encontrada' }));
            return;
          }

          const mod = await loader();
          const handler = (mod.default || mod[req.method || 'GET']) as (r: Request) => Promise<Response>;

          if (typeof handler !== 'function') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ erro: 'Método não suportado' }));
            return;
          }

          // Converte IncomingMessage para Web API Request
          let body: Buffer | undefined;
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
            }
            body = Buffer.concat(chunks);
          }

          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) {
            if (v) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
          }

          const webReq = new Request(parsedUrl.toString(), {
            method: req.method,
            headers,
            body: body && body.length > 0 ? body : undefined,
          });

          const webRes = await handler(webReq);

          res.statusCode = webRes.status;
          webRes.headers.forEach((v, k) => res.setHeader(k, v));
          const arrayBuf = await webRes.arrayBuffer();
          res.end(Buffer.from(arrayBuf));
        } catch (err: unknown) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          const msg = err instanceof Error ? err.message : String(err);
          res.end(JSON.stringify({ erro: `Erro interno no servidor dev: ${msg}` }));
        }
      });
    },
  };
}
