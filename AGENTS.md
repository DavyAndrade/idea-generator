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
- Gemini REST direto (`gemini-2.5-flash` padrão; modelos: `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.5-pro`, `gemini-3.5-flash`, `gemini-3.6-flash`, `gemini-3.7-flash`, `gemini-3.8-flash`, `gemma-4-26b-it`, `gemma-4-31b-it`) — **não** SDK oficial
- Bun como runtime e gerenciador de pacotes
- Estado: React hooks (`useState` / `useEffect`) — **não** Redux/Zustand
- DI: funções puras em `lib/storage.ts` e `lib/gemini.ts` — **não** context providers complexos

## Arquitetura

```
src/
  lib/            # Integração: api-client.ts (fetchApi → /api/* BFF), gemini.ts, crypto.ts, storage.ts, utils.ts
  components/     # Telas e widgets reusáveis
  components/ui/  # Componentes shadcn/ui
  types.ts        # Entidade Ideia, UsuarioSessao, tipos e constantes
  App.tsx         # Shell com navegação por abas (Gerar / Histórico / Config)
api/              # Serverless BFF: api/auth/*, api/ideias/*, api/usuario/* + api/_lib/
```

**Fluxo:** tela → `lib/storage.ts` (via `fetchApi` → `/api/*` BFF) → TursoDB (via BFF). Gemini REST direto no BFF ou via BYOK do usuário.
Regra: tela nunca faz chamada HTTP direta — sempre via `lib/storage.ts` ou `lib/gemini.ts`. O BFF em `api/` é o único que fala com o TursoDB.

## Registro/Login Zero-Knowledge

Zero-knowledge authentication via Web Crypto API (nunca expõe algoritmo no hash).

- `lib/crypto.ts`: `gerarSaltHex()`, `derivarChaves(senha, saltHex, pepper?)` — **Argon2id** (WebAssembly, 19 MiB RAM, 3 iterações, custo zero na Vercel) combinado com **Pepper (`VITE_AUTH_PEPPER`) via HMAC-SHA256**, produzindo `authHashHex` no formato **PHC canônico** `$argon2id$v=19$m=19456,t=3,p=1$...` (OWASP, desestimula atacantes offline) + `vaultKeyHex` (64 hex chars / 256 bits para AES-256-GCM), `verificarArgon2id(senhaPeppered, phcHash)` para verificação de login, `cifrarTexto()` / `decifrarTexto()` (AES-256-GCM IV aleatório), `constantTimeEquals()`
- `lib/storage.ts`: `registrarUsuario()`, `loginUsuario()`, `obterSessaoAtual()`, `encerrarSessao()`, `atualizarNomeUsuario()`, `lerChave()` / `salvarChave()` — comunica-se com o BFF via `fetchApi()` (`lib/api-client.ts`) para rotas `/api/auth/*` e `/api/usuario/*`; autenticado = AES-256-GCM cifrada, legado (sem sessão) = `localStorage`
- `components/tela-auth.tsx`: exige senha forte no cadastro (mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial) com checklist em tempo real.

## Serverless BFF (Backend For Frontend)

O frontend (PWA) não fala diretamente com o TursoDB. Em vez disso, comunica-se com um Serverless BFF exposto via rotas `/api/*` (proxyeado pelo Vite em dev). O BFF é o único cliente do TursoDB — o frontend nunca expõe tokens de banco.

### Rotas BFF (`/api/*`)

| Rota | Método | Auth | Descrição |
|---|---|---|---|
| `/api/auth/registrar` | POST | — | Registro: valida senha forte, gera salt, cria `credencial_hash` PHC, retorna `token` (JWT) + `saltHex` para derivação local do `vaultKey` |
| `/api/auth/login` | POST | — | Login: verifica senha via `verificarArgon2id`, retorna `token` + `saltHex` + `geminiKeyCifrada` (cifrada) |
| `/api/auth/sessao` | GET | — | Verifica/valida sessão retornando usuário + chave Gemini cifrada |
| `/api/usuario/perfil` | PATCH | ✅ | Atualiza `nome` do usuário |
| `/api/usuario/config` | GET | ✅ | Retorna `modelo` e `geminiKeyCifrada` do usuário |
| `/api/usuario/config` | PATCH | ✅ | Atualiza `modelo` e/ou `geminiKeyCifrada` |
| `/api/ideias` | GET | ✅ | Lista ideias do usuário (filtrado por `usuario_id`) |
| `/api/ideias` | POST | ✅ | Cria ideia (campos E2E cifrados: `descricao`, `tema`, `promptUsado`; `titulo` e `categoria` em texto claro) |
| `/api/ideias` | PATCH | ✅ | Alterna `favorito` de uma ideia |
| `/api/ideias?id=<id>` | DELETE | ✅ | Exclui ideia (isolada por `usuario_id`) |

### Proxy dev (Vite)

`vite-plugin-serverless.ts` intercepta `/api/*` durante `vite dev` e despacha para os handlers em `api/` via dynamic import. Em produção, as rotas `/api/*` são servidas por uma plataforma serverless (Vercel Functions, Netlify, Cloudflare Workers).

### Variáveis de ambiente

- **Servidor (BFF)**: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `AUTH_PEPPER` (ou `VITE_AUTH_PEPPER`), `JWT_SECRET` — nunca expostas ao browser
- **Frontend (PWA)**: nenhum token de banco — apenas `VITE_AUTH_PEPPER` não é mais necessário no cliente

### Tabelas (criadas pelo BFF via `initTursoServer()`)

```sql
CREATE TABLE usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  credencial_hash TEXT NOT NULL,  -- authHash PHC canônico: $argon2id$v=19$m=19456,t=3,p=1$<salt_b64>$<hash_b64> (salt embutido, Argon2id + Pepper HMAC-SHA256, 256 bits, OWASP — desestimula atacantes offline)
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

- `gemini_key_cifrada` + `gemini_modelo` → tabela `usuarios` (modo autenticado via BFF)
- Ideias → tabela `ideias` com `usuario_id INTEGER NOT NULL REFERENCES usuarios(id)` — todas as operações CRUD via BFF filtram por `usuario_id`
- Criptografia E2E de ideias: `salvarIdeia` cifra `descricao`, `tema` e `promptUsado` com AES-256-GCM (`vaultKeyHex`); `titulo` e `categoria` ficam em texto claro — `listarIdeias` decifra automaticamente ao ler
- Categorias: `CATEGORIAS` em `types.ts` define `'App'`, `'Negócio'`, `'Conteúdo'`, `'Open Source'`, `'Hobby'`
- Histórico: `listarIdeias({ somenteFavoritas, busca, categoria })` — filtragem em memória após decifrar (ciphertext não é indexável no SQL)

## Gemini integration

- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent`
- Auth: header `x-goog-api-key`
- `responseMimeType: application/json` + `responseSchema` com `titulo`, `descricao`, `categoria`
- Modelos disponíveis: `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.5-pro`, `gemini-3.5-flash`, `gemini-3.6-flash`, `gemini-3.7-flash`, `gemini-3.8-flash`, `gemma-4-26b-it`, `gemma-4-31b-it` (`MODELOS_DISPONIVEIS` em `types.ts`)
- Modelo padrão: `gemini-2.5-flash`; usuário troca nas configurações
- Sem chave configurada → UI mostra banner, não tenta chamar API

## Variáveis de ambiente

### Frontend (PWA)

```env
VITE_AUTH_PEPPER=SEU_PEPPER_ALEATORIO
```

O PWA não precisa de credenciais de banco — apenas o pepper (fallback de desenvolvimento).

### BFF / Servidor (`api/`)

```env
TURSO_DATABASE_URL=libsql://SEU-BANCO.turso.io
TURSO_AUTH_TOKEN=SEU_TOKEN
AUTH_PEPPER=SEU_PEPPER_ALEATORIO
JWT_SECRET=SEU_SEGREDO_JWT
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
