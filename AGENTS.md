# AGENTS.md

## Project

Gerador de Ideias — PWA React que gera ideias criativas via Gemini (BYOK).
Repositório: `/home/davy/Desenvolvimento/Projetos/GeradorDeIdeias`

## Commands

All from `apps/web/` (root `package.json` scripts delegate via `bun --cwd apps/web`):

- `bun install` — instalar dependências
- `bun --cwd apps/web run dev` — iniciar servidor de desenvolvimento (localhost:5173)
- `bun --cwd apps/web run build` — build de produção → `dist/`
- `bun --cwd apps/web run preview` — preview do build local
- `bun --cwd apps/web test` — rodar testes (Vitest)
- `bun --cwd apps/web x tsc --noEmit` — verificar tipos TypeScript

## Stack decisions (não mudar sem pedido explícito)

- React 19 + TypeScript + Vite
- Tailwind CSS v4 + shadcn/ui
- PWA (Service Worker cache-first para shell + manifest.webmanifest)
- TursoDB via HTTP Pipeline v2 (Hrana v2) — **não** `@libsql/client`
- Gemini REST direto (`gemini-2.5-flash`) — **não** SDK oficial
- Bun como runtime e gerenciador de pacotes
- Estado: React hooks (`useState` / `useEffect`) — **não** Redux/Zustand
- DI: funções puras em `lib/storage.ts` e `lib/gemini.ts` — **não** context providers complexos

## Arquitetura

```
apps/web/src/
  lib/            # Integração: turso.ts, gemini.ts, storage.ts, utils.ts
  components/     # Telas e widgets reusáveis
  components/ui/  # Componentes shadcn/ui
  types.ts        # Entidade Ideia, tipos e constantes
  App.tsx         # Shell com navegação por abas (Gerar / Histórico / Config)
```

**Fluxo:** tela → `lib/storage.ts` (CRUD via Turso HTTP Pipeline) → API externa (Gemini REST).
Regra: tela nunca faz chamada HTTP direta — sempre via `lib/storage.ts` ou `lib/gemini.ts`.

## TursoDB

Tabelas (criadas automaticamente por `initTurso()`):

```sql
CREATE TABLE configuracoes (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
CREATE TABLE ideias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  tema TEXT NOT NULL,
  categoria TEXT NOT NULL,
  prompt_usado TEXT,
  favorito INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL
);
```

- `gemini_api_key` e `gemini_modelo` → tabela `configuracoes`
- Ideias → tabela `ideias`
- Busca: `listarIdeias({ somenteFavoritas, busca })` com `LIKE` no SQL

## Gemini integration

- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent`
- Auth: header `x-goog-api-key`
- `responseMimeType: application/json` + `responseSchema` com `titulo`, `descricao`, `categoria`
- Modelo padrão: `gemini-2.5-flash`; usuário troca nas configurações
- Sem chave configurada → UI mostra banner, não tenta chamar API

## Variáveis de ambiente

```env
VITE_TURSO_DATABASE_URL=libsql://SEU-BANCO.turso.io
VITE_TURSO_AUTH_TOKEN=SEU_TOKEN
```

## Testing

- Unit: `lib/gemini.ts`, `lib/turso.ts`, `lib/storage.ts`, `lib/utils.ts` (Vitest)
- Component: telas com React Testing Library
- Rodar: `bun test`

## Conventions

- Arquivos em kebab-case; componentes em PascalCase
- Componentes shadcn/ui em `components/ui/`
- Labels e comentários em pt-BR
- Sem backend próprio — app fala direto com API externa (Gemini + Turso)
- Commit: Conventional Commits em pt-BR, ex: `feat: tela de histórico com busca`
