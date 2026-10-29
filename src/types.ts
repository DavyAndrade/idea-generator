export const CATEGORIAS = [
  'App',
  'Negócio',
  'Conteúdo',
  'Open Source',
  'Hobby',
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export const MODELOS_DISPONIVEIS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
  'gemma-4-26b-it',
  'gemma-4-31b-it',
] as const;

export type ModeloGemini = (typeof MODELOS_DISPONIVEIS)[number];

export const MODELO_PADRAO: ModeloGemini = 'gemini-2.5-flash';

export interface Ideia {
  id: number;
  titulo: string;
  descricao: string;
  tema: string;
  categoria: string;
  promptUsado?: string;
  favorito: boolean;
  criadoEm: string;
}

export type NovaIdeiaInput = Omit<Ideia, 'id' | 'criadoEm' | 'favorito'> & {
  favorito?: boolean;
  criadoEm?: string;
};

export interface UsuarioSessao {
  id: number;
  nome: string;
  email: string;
  vaultKeyHex: string;
  token?: string;
}
