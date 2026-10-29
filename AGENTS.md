# AGENTS.md

## Project

Lumi (Gerador de Ideias) — PWA React que gera ideias criativas via Gemini (BYOK).
Repositório: `/home/davy/Desenvolvimento/Projetos/GeradorDeIdeias`

## Commands

Todos na raiz do repositório:

- `bun install` — instalar dependências
- `bun run dev` — iniciar servidor de desenvolvimento (localhost:5173)
- `bun run build` — build de produção → `dist/`
- `bun run preview` — preview do build local
- `bun test` — rodar testes
- `bun x tsc --noEmit` — verificar tipos TypeScript

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
src/
  lib/            # Integração: turso.ts, gemini.ts, crypto.ts, storage.ts, utils.ts
  components/     # Telas e widgets reusáveis
  components/ui/  # Componentes shadcn/ui
  types.ts        # Entidade Ideia, UsuarioSessao, tipos e constantes
  App.tsx         # Shell com navegação por abas (Gerar / Histórico / Config)
```

**Fluxo:** tela → `lib/storage.ts` (auth + CRUD via Turso HTTP Pipeline) → API externa (Gemini REST).
Regra: tela nunca faz chamada HTTP direta — sempre via `lib/storage.ts`, `lib/gemini.ts` ou `lib/crypto.ts`.

## Registro/Login Zero-Knowledge

Zero-knowledge authentication via Web Crypto API (nunca expõe algoritmo no hash).

- `lib/crypto.ts`: `gerarSaltHex()`, `derivarChaves()` (PBKDF2-SHA256 → authHashHex + vaultKeyHex, ambas 64 hex chars), `cifrarTexto()` / `decifrarTexto()` (AES-256-GCM IV aleatório), `constantTimeEquals()`
- `lib/storage.ts`: `registrarUsuario()`, `loginUsuario()`, `obterSessaoAtual()`, `encerrarSessao()`, `lerChave()` / `salvarChave()` (autenticado = AES-256-GCM cifrada, legado = texto plano)
- `components/tela-auth.tsx`: exige senha forte no cadastro (mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial) com checklist em tempo real.

## TursoDB

Tabelas (criadas automaticamente por `initTurso()`):

```sql
CREATE TABLE configuracoes (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
CREATE TABLE usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  salt TEXT NOT NULL,
  credencial_hash TEXT NOT NULL,  -- authHashHex (PBKDF2, 256 bits, formato opaco)
  gemini_key_cifrada TEXT,        -- AES-256-GCM cifrada com vaultKeyHex
  gemini_modelo TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
  criado_em TEXT NOT NULL
);
CREATE TABLE ideias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  tema TEXT NOT NULL,
  categoria TEXT NOT NULL,
  prompt_usado TEXT,
  favorito INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL
);
```

- `gemini_api_key` + `gemini_modelo` → tabela `configuracoes` (modo legado) **ou** `usuarios.gemini_key_cifrada` + `usuarios.gemini_modelo` (modo autenticado)
- Ideias → tabela `ideias` com `usuario_id INTEGER NOT NULL REFERENCES usuarios(id)` — quando há sessão ativa, `salvarIdeia`, `listarIdeias`, `excluirIdeia` e `alternarFavorito` filtram isolam por `usuario_id`; modo legado (sem login) não filtra
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

- Unit: `lib/gemini.ts`, `lib/turso.ts`, `lib/crypto.ts`, `lib/storage.ts`, `lib/utils.ts` (Vitest)
- Component: telas com React Testing Library
- Rodar: `bun test`

## Conventions

- Arquivos em kebab-case; componentes em PascalCase
- Componentes shadcn/ui em `components/ui/`
- Labels e comentários em pt-BR
- Sem backend próprio — app fala direto com API externa (Gemini + Turso)
- Commit: Conventional Commits em pt-BR, ex: `feat: tela de histórico com busca`
