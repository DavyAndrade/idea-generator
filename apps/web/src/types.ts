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
