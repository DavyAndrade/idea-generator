import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { gerarIdeiaGemini, testarConexaoGemini } from '@/lib/gemini';

describe('gemini.ts', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('gerarIdeiaGemini faz POST para endpoint correto com x-goog-api-key', async () => {
    const mockResp = {
      candidates: [{ content: { parts: [{ text: JSON.stringify({ titulo: 'Teste', descricao: 'Desc', categoria: 'App' }) }] } }],
    };
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResp),
    });

    const result = await gerarIdeiaGemini({
      tema: 'Tecnologia',
      categoria: 'App',
      chave: 'minha-chave',
      modelo: 'gemini-2.5-flash',
    });

    expect(result.titulo).toBe('Teste');
    expect(result.descricao).toBe('Desc');
    expect(result.tema).toBe('Tecnologia');

    const call = (globalThis.fetch as any).mock.calls[0];
    expect(call[0]).toContain('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
    expect(call[1].method).toBe('POST');
    expect(call[1].headers['x-goog-api-key']).toBe('minha-chave');
    expect(call[1].headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(call[1].body);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.responseSchema.properties.titulo).toBeDefined();
    expect(body.generationConfig.responseSchema.properties.descricao).toBeDefined();
    expect(body.generationConfig.responseSchema.properties.categoria).toBeDefined();
  });

  it('gerarIdeiaGemini usa modelo padrão quando não especificado', async () => {
    const mockResp = {
      candidates: [{ content: { parts: [{ text: JSON.stringify({ titulo: 'T', descricao: 'D', categoria: 'App' }) }] } }],
    };
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResp),
    });

    await gerarIdeiaGemini({ tema: 'T', categoria: 'App', chave: 'key' });

    const call = (globalThis.fetch as any).mock.calls[0];
    expect(call[0]).toContain('gemini-2.5-flash');
  });

  it('gerarIdeiaGemini lança erro quando API retorna erro HTTP', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({ error: { message: 'API key invalid' } }),
    });

    await expect(gerarIdeiaGemini({ tema: 'T', categoria: 'App', chave: 'bad-key' })).rejects.toThrow('API key invalid');
  });

  it('gerarIdeiaGemini lança erro quando text não é JSON válido', async () => {
    const invalidText = 'nao e json';
    const mockResp = {
      candidates: [{ content: { parts: [{ text: invalidText }] } }],
    };
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResp),
    });

    await expect(
      gerarIdeiaGemini({ tema: 'T', categoria: 'App', chave: 'key' }),
    ).rejects.toThrow();
  });

  it('gerarIdeiaGemini lança erro quando sem candidates', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ candidates: [] }),
    });

    await expect(gerarIdeiaGemini({ tema: 'T', categoria: 'App', chave: 'key' })).rejects.toThrow('Nenhuma resposta');
  });

  it('gerarIdeiaGemini lança erro quando text vazio', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ candidates: [{ content: { parts: [] } }] }),
    });

    await expect(gerarIdeiaGemini({ tema: 'T', categoria: 'App', chave: 'key' })).rejects.toThrow('conteúdo');
  });

  it('gerarIdeiaGemini inclui promptUsado no resultado', async () => {
    const mockResp = {
      candidates: [{ content: { parts: [{ text: JSON.stringify({ titulo: 'T', descricao: 'D', categoria: 'App' }) }] } }],
    };
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResp),
    });

    const result = await gerarIdeiaGemini({ tema: 'Tech', categoria: 'App', chave: 'key' });
    expect(result.promptUsado).toContain('Gere uma ideia criativa');
    expect(result.promptUsado).toContain('Tech');
  });

  it('testarConexaoGemini retorna ok=false sem chave', async () => {
    const result = await testarConexaoGemini('');
    expect(result.ok).toBe(false);
    expect(result.mensagem).toContain('Chave de API');
  });

  it('testarConexaoGemini retorna ok=true em sucesso', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: '{"status":"ok"}' }] } }] }),
    });

    const result = await testarConexaoGemini('valid-key');
    expect(result.ok).toBe(true);
    expect(result.mensagem).toContain('Gemini');
  });

  it('testarConexaoGemini retorna ok=false em HTTP error', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: () => Promise.resolve({ error: { message: 'Quota exceeded' } }),
    });

    const result = await testarConexaoGemini('bad-key');
    expect(result.ok).toBe(false);
    expect(result.mensagem).toContain('Quota exceeded');
  });

  it('testarConexaoGemini retorna ok=false em erro de rede', async () => {
    (globalThis.fetch as any).mockRejectedValue(new Error('Network error'));

    const result = await testarConexaoGemini('key');
    expect(result.ok).toBe(false);
    expect(result.mensagem).toContain('rede');
  });

  it('testarConexaoGemini usa modelo padrão quando não especificado', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await testarConexaoGemini('key');
    const call = (globalThis.fetch as any).mock.calls[0];
    expect(call[0]).toContain('gemini-2.5-flash');
  });

  it('testarConexaoGemini usa modelo customizado', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await testarConexaoGemini('key', 'gemini-3.5-flash');
    const call = (globalThis.fetch as any).mock.calls[0];
    expect(call[0]).toContain('gemini-3.5-flash');
  });
});
