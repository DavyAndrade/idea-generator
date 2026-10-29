# Gerador de Ideias

App PWA (Progressive Web App) que gera ideias criativas usando **Gemini** com
**BYOK** (Bring Your Own Key): o usuário informa a própria chave de API do
Google AI Studio.

## Stack

- **React 19** + **TypeScript** + **Vite** (build e dev server)
- **Tailwind CSS v4** + **shadcn/ui** (design system)
- **PWA** — Service Worker (cache-first para shell, network-first para navegação) + `manifest.webmanifest`
- **Bun** — runtime e gerenciador de pacotes
- **TursoDB** (HTTP Pipeline v2 / Hrana v2) — persistência de chave API, modelo e ideias
- **Gemini REST** direto (`gemini-2.5-flash`), sem SDK oficial

## Arquitetura

```
apps/web/
  src/
    lib/            # Integração: turso.ts (HTTP Pipeline v2), gemini.ts (REST), storage.ts (CRUD), utils.ts
    components/     # TelaGerar, TelaHistorico, TelaConfiguracao, AppBar, BannerSemChave, IdeiaCard
    components/ui/  # shadcn/ui (Badge, Button, Card, Input)
    types.ts        # Ideia, Categoria, ModeloGemini, constantes
    App.tsx         # Shell com navegação por abas
    main.tsx        # Entry point React 19
  public/           # manifest.webmanifest, sw.js, icon.svg
```

**Fluxo:** tela → `lib/storage.ts` (CRUD local via Turso) → API externa (Gemini REST).
Não há backend próprio — o app fala direto com Gemini e Turso.

## Variáveis de ambiente

Crie `.env.local` em `apps/web/`:

```env
VITE_TURSO_DATABASE_URL=libsql://SEU-BANCO.turso.io
VITE_TURSO_AUTH_TOKEN=SEU_TOKEN_DE_LEITURA/GRAVACAO
```

- `VITE_TURSO_DATABASE_URL` — URL do banco Turso (formato `libsql://...`)
- `VITE_TURSO_AUTH_TOKEN` — token de acesso (Pipeline v2 = escopo `read`, `write`)

## Comandos

```bash
bun install              # instalar deps (na raiz ou apps/web)
bun run dev              # iniciar servidor de desenvolvimento (localhost:5173)
bun run build            # build de produção → apps/web/dist
bun run preview          # preview do build local
bun test                 # rodar testes (Vitest)
bun run typecheck        # verificar tipos TypeScript
```

## CI/CD

GitHub Actions em `.github/workflows/ci.yml` (`main` branch):

1. Checkout
2. Install Bun + deps
3. `tsc --noEmit` (type-safe)
4. `vitest` (testes)
5. `vite build` (build PWA)
6. Upload de `apps/web/dist` como artifact

## Build

```bash
bun run build            # gera apps/web/dist/
```

A PWA é servida como arquivos estáticos (Vercel, Netlify, Cloudflare Pages, etc).

## Setup

1. `bun install`
2. Configure `.env.local` com suas credenciais do Turso
3. Crie uma chave no [Google AI Studio](https://aistudio.google.com/apikey)
4. Rode `bun run dev`
