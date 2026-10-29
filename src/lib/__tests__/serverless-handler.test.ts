import { describe, it, expect, vi } from 'vitest';
import { createApiHandler, json, errorResponse } from '../../../api/_lib/http';

describe('createApiHandler (Universal Vercel Serverless Adapter)', () => {
  it('deve responder corretamente no modo Web API puro (Request -> Response)', async () => {
    const handler = createApiHandler(async (req) => {
      const body = (await req.json()) as { test: string };
      return json({ received: body.test });
    });

    const webReq = new Request('https://localhost/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'hello world' }),
    });

    const res = await handler(webReq);
    expect(res).toBeInstanceOf(Response);
    if (res instanceof Response) {
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ received: 'hello world' });
    }
  });

  it('deve responder corretamente no modo Node.js / Vercel Serverless (req, res)', async () => {
    const handler = createApiHandler(async (req) => {
      const body = (await req.json()) as { message: string };
      return json({ ok: true, echo: body.message }, 201);
    });

    const mockReq = {
      method: 'POST',
      url: '/api/test-node',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-proto': 'https',
        host: 'lumi.vercel.app',
      },
      body: { message: 'salve vercel' }, // Vercel pré-parseia o body
    };

    let statusCode = 0;
    const responseHeaders: Record<string, string> = {};
    let responseBody = '';

    const mockRes = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      setHeader(name: string, val: string) {
        responseHeaders[name] = val;
      },
      end(data: Buffer) {
        responseBody = data.toString('utf-8');
      },
    };

    await handler(mockReq, mockRes);

    expect(statusCode).toBe(201);
    expect(responseHeaders['content-type'] || responseHeaders['Content-Type']).toBe('application/json');
    expect(JSON.parse(responseBody)).toEqual({ ok: true, echo: 'salve vercel' });
  });

  it('deve capturar exceções e retornar JSON 500 no modo Node.js sem travar o Vercel', async () => {
    const handler = createApiHandler(async () => {
      throw new Error('TURSO_DATABASE_URL não configurada no servidor');
    });

    const mockReq = {
      method: 'GET',
      url: '/api/error-test',
      headers: { host: 'localhost' },
    };

    let statusCode = 0;
    let responseJson: Record<string, unknown> = {};

    const mockRes = {
      status(code: number) {
        statusCode = code;
        return {
          json(obj: Record<string, unknown>) {
            responseJson = obj;
          },
        };
      },
    };

    await handler(mockReq, mockRes);

    expect(statusCode).toBe(500);
    expect(responseJson.erro).toContain('TURSO_DATABASE_URL não configurada no servidor');
  });
});
