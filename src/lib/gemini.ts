// Integração direta com Gemini REST v1beta.
// responseMimeType: application/json + responseSchema {titulo, descricao, categoria}
import type { ModeloGemini, NovaIdeiaInput } from '@/types';
import { MODELO_PADRAO } from '@/types';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export interface GerarIdeiaParams {
  tema: string;
  categoria: string;
  chave: string;
  modelo?: ModeloGemini;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    code: number;
    message: string;
  };
}

function getModelo(modelo?: ModeloGemini): ModeloGemini {
  return modelo ?? MODELO_PADRAO;
}

// Schema para resposta JSON tipada
function getResponseSchema() {
  return {
    type: 'object' as const,
    properties: {
      titulo: {
        type: 'string' as const,
        description: 'Título curto e impactante da ideia',
      },
      descricao: {
        type: 'string' as const,
        description: 'Descrição detalhada da ideia, incluindo funcionalidades e proposta de valor',
      },
      categoria: {
        type: 'string' as const,
        description: 'Categoria da ideia (App, Negócio, Conteúdo, Open Source, Hobby)',
      },
    },
    required: ['titulo', 'descricao', 'categoria'],
  };
}

export async function gerarIdeiaGemini(params: GerarIdeiaParams): Promise<NovaIdeiaInput> {
  const { tema, categoria, chave, modelo } = params;
  const model = getModelo(modelo);

  const prompt = `Gere uma ideia criativa para o tema "${tema}" na categoria "${categoria}".
A ideia deve ser original, prática e bem estruturada. Inclua uma descrição clara com funcionalidades e proposta de valor.`;

  const body = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: getResponseSchema(),
      temperature: 0.9,
      maxOutputTokens: 2048,
    },
  };

  const res = await fetch(`${GEMINI_BASE}/models/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': chave,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as GeminiResponse;
    throw new Error(
      err.error?.message ?? `Erro ${res.status} ao chamar Gemini API`,
    );
  }

  const data = (await res.json()) as GeminiResponse;

  if (data.error) {
    throw new Error(`${data.error.message}`);
  }

  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('Nenhuma resposta recebida da API do Gemini');
  }

  const parts = data.candidates[0]?.content?.parts;
  if (!parts || parts.length === 0 || !parts[0]?.text) {
    throw new Error('Resposta do Gemini não contém conteúdo');
  }

  const texto = parts[0].text.trim();
  const json = JSON.parse(texto) as { titulo: string; descricao: string; categoria: string };

  return {
    titulo: json.titulo,
    descricao: json.descricao,
    tema,
    categoria: json.categoria,
    promptUsado: prompt,
  };
}

export async function testarConexaoGemini(
  chave: string,
  modelo?: ModeloGemini,
): Promise<{ ok: boolean; mensagem: string }> {
  if (!chave) {
    return { ok: false, mensagem: 'Chave de API não informada' };
  }

  const model = getModelo(modelo);

  try {
    const res = await fetch(`${GEMINI_BASE}/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'x-goog-api-key': chave,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: 'Responda apenas com: {"status":"ok"}' }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as GeminiResponse;
      return {
        ok: false,
        mensagem: err.error?.message ?? `Erro ${res.status} na API do Gemini`,
      };
    }

    return { ok: true, mensagem: `Conexão com Gemini (${model}) OK` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, mensagem: `Falha de rede: ${msg}` };
  }
}
