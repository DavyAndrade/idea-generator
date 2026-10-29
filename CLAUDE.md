# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository (**Lumi** — AI Idea Generator PWA).

## Architecture

**Layered flow:** UI components → `src/lib/storage.ts` (via `fetchApi` → `/api/*` BFF) → TursoDB (via BFF only). Zero-knowledge on the client: Argon2id + Pepper HMAC-SHA256 → PHC `$argon2id` format + AES-256-GCM vault. No direct TursoDB access from the browser.

- `src/lib/` — integration layer: `api-client.ts` (`fetchApi` → `/api/*` BFF with Bearer JWT), `gemini.ts` (REST v1beta, BYOK via x-goog-api-key), `crypto.ts` (Web Crypto zero-knowledge auth: Argon2id + Pepper HMAC-SHA256 → PHC `$argon2id` format with embedded salt + AES-256-GCM vault), `storage.ts` (auth + per-user `usuario_id` isolated CRUD via BFF endpoints), `utils.ts` (`cn()`).
- `api/` — Serverless BFF (Backend For Frontend): `api/auth/registrar.ts`, `api/auth/login.ts`, `api/auth/sessao.ts`, `api/ideias/index.ts`, `api/usuario/perfil.ts`, `api/usuario/config.ts` + `api/_lib/` (`http.ts`, `turso.ts`, `crypto.ts`, `jwt.ts`). The BFF is the only client of TursoDB — no tokens exposed to the browser.
- `src/components/` — app components: `App.tsx` (tab shell), `app-bar.tsx`, `tela-auth.tsx` (login/register with strong password policy: 8+ chars, upper, lower, digit, special char), `banner-sem-chave.tsx`, `tela-gerar.tsx`, `tela-historico.tsx` (category filter: App, Negócio, Conteúdo, Open Source, Hobby + Somente favoritas + busca em memória após decifrar), `tela-configuracao.tsx`, `ideia-card.tsx`, `acao-toast.tsx`.
- `src/components/ui/` — shadcn-style primitives: `button.tsx`, `card.tsx`, `input.tsx`, `badge.tsx`.
- `src/types.ts` — `Ideia`, `UsuarioSessao` (com `token?` para JWT de sessão), `Categoria`, `ModeloGemini`, `CATEGORIAS`, `MODELOS_DISPONIVEIS` (gemini-2.5-flash, gemini-2.5-flash-lite, gemini-2.5-pro, gemini-3.5-flash, gemini-3.6-flash, gemini-3.7-flash, gemini-3.8-flash, gemma-4-26b-it, gemma-4-31b-it), `MODELO_PADRAO`.
- `src/lib/crypto.ts` exports: `gerarSaltHex`, `derivarChaves` (Argon2id + Pepper → PHC `$argon2id` + vaultKeyHex), `verificarArgon2id`, `extrairSaltDePHC` (extrai salt embutido no PHC), `cifrarTexto`/`decifrarTexto` (AES-256-GCM), `constantTimeEquals`.
- `src/index.css` — Tailwind v4 + shadcn theme vars (light/dark via `:root` / `html.dark`).
- `public/` — `manifest.webmanifest`, `sw.js`, `icon.svg`.

**UI shell** (`App.tsx`): `max-w-md mx-auto min-h-dvh flex flex-col border-x shadow-sm` container with `AppBar` + sticky bottom nav (3 tabs: Gerar, Histórico, Config via lucide-react icons).

## Commands

All from the repository root:

| Command | Purpose |
|---|---|
| `bun install` | install deps |
| `bun run dev` | Vite dev server (localhost:5173) with `/api/*` BFF proxy via `vite-plugin-serverless.ts` |
| `bun run build` | production build → `dist/` |
| `bun run preview` | serve local build |
| `bun test` | run unit tests |
| `bun x tsc --noEmit` | typecheck |

## Environment

The PWA (frontend) does NOT require TursoDB credentials — the BFF is the only client.

### Frontend (`.env.local` in repo root)

```env
VITE_AUTH_PEPPER=SEU_PEPPER_ALEATORIO
```

### BFF / Server (`api/`)

```env
TURSO_DATABASE_URL=libsql://SEU-BANCO.turso.io
TURSO_AUTH_TOKEN=SEU_TOKEN
AUTH_PEPPER=SEU_PEPPER_ALEATORIO
JWT_SECRET=SEU_SEGREDO_JWT
```

- `TURSO_DATABASE_URL` — URL do banco Turso (formato `libsql://...`)
- `TURSO_AUTH_TOKEN` — token de acesso do Turso (escopo `read`/`write`)
- `AUTH_PEPPER` — pepper aleatório para HMAC-SHA256 antes do Argon2id
- `JWT_SECRET` — segredo para assinatura de tokens de sessão (JWT HS256, 30 dias)

## CI

`.github/workflows/ci.yml` on `main`: install Bun → `tsc --noEmit` → `bun test` → `vite build` → upload `dist` artifact.
