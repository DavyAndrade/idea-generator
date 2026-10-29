# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository (**Lumi** — AI Idea Generator PWA).

## Architecture

**Layered flow:** UI components → `src/lib/storage.ts` (auth + Turso CRUD) → external APIs (Gemini REST, Turso HTTP Pipeline v2). No backend of its own.

- `src/lib/` — integration layer: `turso.ts` (HTTP Pipeline v2 client, libsql/turso→https), `gemini.ts` (REST v1beta, BYOK via x-goog-api-key), `crypto.ts` (Web Crypto zero-knowledge auth: Argon2id + Pepper HMAC-SHA256 + AES-256-GCM vault), `storage.ts` (auth + per-user `usuario_id` isolated CRUD over Turso `configuracoes`/`usuarios` + `ideias` tables), `utils.ts` (`cn()`).
- `src/components/` — app components: `App.tsx` (tab shell), `app-bar.tsx`, `tela-auth.tsx` (login/register with strong password policy: 8+ chars, upper, lower, digit, special char), `banner-sem-chave.tsx`, `tela-gerar.tsx`, `tela-historico.tsx`, `tela-configuracao.tsx`, `ideia-card.tsx`, `acao-toast.tsx`.
- `src/components/ui/` — shadcn-style primitives: `button.tsx`, `card.tsx`, `input.tsx`, `badge.tsx`.
- `src/types.ts` — `Ideia`, `UsuarioSessao`, `Categoria`, `ModeloGemini`, `CATEGORIAS`, `MODELOS_DISPONIVEIS`, `MODELO_PADRAO`.
- `src/index.css` — Tailwind v4 + shadcn theme vars (light/dark via `:root` / `html.dark`).
- `public/` — `manifest.webmanifest`, `sw.js`, `icon.svg`.

**UI shell** (`App.tsx`): `max-w-md mx-auto min-h-dvh flex flex-col border-x shadow-sm` container with `AppBar` + sticky bottom nav (3 tabs: Gerar, Histórico, Config via lucide-react icons).

## Commands

All from the repository root:

| Command | Purpose |
|---|---|
| `bun install` | install deps |
| `bun run dev` | Vite dev server (localhost:5173) |
| `bun run build` | production build → `dist/` |
| `bun run preview` | serve local build |
| `bun test` | run unit tests |
| `bun x tsc --noEmit` | typecheck |

## Environment

Create `.env.local` (or `.env`) in the repo root:
```env
VITE_TURSO_DATABASE_URL=libsql://SEU-BANCO.turso.io
VITE_TURSO_AUTH_TOKEN=SEU_TOKEN
VITE_AUTH_PEPPER=SEU_PEPPER_ALEATORIO
```

## CI

`.github/workflows/ci.yml` on `main`: install Bun → `tsc --noEmit` → `bun test` → `vite build` → upload `dist` artifact.
