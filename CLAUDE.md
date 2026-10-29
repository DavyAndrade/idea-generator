# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

```
GeradorDeIdeias/
  apps/
    web/        # React 19 + TypeScript + Vite PWA + TursoDB (main workspace)
  graphify-out/ # Knowledge graph (graph.json, wiki/index.md) — run `graphify query` first
                # for codebase questions before grepping raw files
```

## Web App (`apps/web/`) Architecture

**Layered flow:** UI components → `lib/storage.ts` (Turso CRUD) → external APIs (Gemini REST, Turso HTTP Pipeline v2). No backend of its own.

- `src/lib/` — integration layer: `turso.ts` (HTTP Pipeline v2 client, libsql→https), `gemini.ts` (REST v1beta, BYOK via x-goog-api-key), `storage.ts` (CRUD over Turso `configuracoes` + `ideias` tables), `utils.ts` (`cn()`).
- `src/components/` — app components: `App.tsx` (tab shell), `app-bar.tsx`, `banner-sem-chave.tsx`, `tela-gerar.tsx`, `tela-historico.tsx`, `tela-configuracao.tsx`, `ideia-card.tsx`, `acao-toast.tsx`.
- `src/components/ui/` — shadcn-style primitives: `button.tsx`, `card.tsx`, `input.tsx`, `badge.tsx`.
- `src/types.ts` — `Ideia`, `Categoria`, `ModeloGemini`, `CATEGORIAS`, `MODELOS_DISPONIVEIS`, `MODELO_PADRAO`.
- `src/index.css` — Tailwind + shadcn theme vars (purple/deepPurple, light/dark via `:root` / `html.dark`).
- `public/` — `manifest.webmanifest`, `sw.js`, icons.

**UI shell** (`App.tsx`): `max-w-md mx-auto min-h-dvh flex flex-col border-x shadow-sm` container with AppBar + sticky bottom nav (3 tabs: Gerar, Histórico, Config via lucide-react icons).

## Commands

All from `apps/web/` (CI uses `bun --cwd apps/web …`).

| Command | Purpose |
|---|---|
| `bun install` | install deps (from repo root or apps/web) |
| `bun --cwd apps/web run dev` | Vite dev server (localhost:5173) |
| `bun --cwd apps/web run build` | production build → `dist/` |
| `bun --cwd apps/web run preview` | serve local build |
| `bun --cwd apps/web test` | Vitest test runner |
| `bun --cwd apps/web test -- --run` | run tests once (CI mode) |
| `bun --cwd apps/web test <file>` | single test file |
| `bun --cwd apps/web x tsc --noEmit` | typecheck |
| `graphify update .` | update code knowledge graph (AST-only, no API cost) |

## Environment

Create `apps/web/.env.local`:
```env
VITE_TURSO_DATABASE_URL=libsql://SEU-BANCO.turso.io
VITE_TURSO_AUTH_TOKEN=SEU_TOKEN
```

## Key Constraints

- The web app uses a mobile-first shell (`max-w-md mx-auto min-h-dvh`) with 3 tabs (`Gerar`, `Histórico`, `Config`).
- `lib/` APIs are all async (TursoDB). `gerarIdeiaGemini({tema, categoria, chave, modelo?})`, `testarConexaoGemini(chave, modelo?)` (positional).
- `graphify-out/graph.json` exists — run `graphify query "<question>"` before grep for codebase questions.

## CI

`.github/workflows/ci.yml` on `main`: install Bun → `tsc --noEmit` → `vitest` → `vite build` → upload `dist` artifact.
