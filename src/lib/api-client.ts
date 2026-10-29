// Cliente HTTP para as rotas /api/*
import type { UsuarioSessao } from '@/types';

const STORAGE_KEY = 'lumi_sessao_usuario';

export function getSessionToken(): string | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const sessao = JSON.parse(raw) as UsuarioSessao;
    return sessao.token || null;
  } catch {
    return null;
  }
}

export async function fetchApi<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getSessionToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const msg =
      data && typeof data === 'object' && 'erro' in data
        ? String(data.erro)
        : `Erro na requisição (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
}
