# Lumi

**Lumi** é um PWA (Progressive Web App) que ilumina ideias criativas usando **Gemini** com
**BYOK** (Bring Your Own Key): o usuário informa a própria chave de API do
Google AI Studio, protegida com criptografia ponta a ponta (`AES-256-GCM`).

## Stack

- **React 19** + **TypeScript** + **Vite** (build e dev server)
- **Tailwind CSS v4** + **shadcn/ui** (design system)
- **PWA** — Service Worker (cache-first para shell, network-first para navegação) + `manifest.webmanifest`
- **Bun** — runtime e gerenciador de pacotes
- **TursoDB** (HTTP Pipeline v2 / Hrana v2) — persistência de chave API, modelo e ideias
- **Gemini REST** direto (`gemini-2.5-flash` padrão), sem SDK oficial — modelos suportados: `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.5-pro`, `gemini-3.5-flash`, `gemini-3.6-flash`, `gemini-3.7-flash`, `gemini-3.8-flash`, `gemma-4-26b-it`, `gemma-4-31b-it`

## Arquitetura

```
src/
  lib/            # Integração: turso.ts (HTTP Pipeline v2), gemini.ts (REST), crypto.ts (Web Crypto), storage.ts (auth + CRUD), utils.ts
  components/     # TelaAuth, TelaGerar, TelaHistorico (busca + filtro categoria + favoritas), TelaConfiguracao, AppBar, BannerSemChave, IdeiaCard
  components/ui/  # shadcn/ui (Badge, Button, Card, Input)
  types.ts        # Ideia, UsuarioSessao, Categoria, ModeloGemini, constantes
  App.tsx         # Shell com navegação por abas (Gerar / Histórico / Config)
  main.tsx        # Entry point React 19
public/           # manifest.webmanifest, sw.js, icon.svg
```

**Fluxo:** tela → `lib/storage.ts` (auth + CRUD via Turso HTTP Pipeline) → API externa (Gemini REST).
Não há backend próprio — o app fala direto com Gemini e Turso.

## Registro/Login Zero-Knowledge

O sistema de autenticação é **zero-knowledge**: a senha nunca deixa o cliente nem é armazenada no servidor.

1. **Registro (`TelaAuth` + `registrarUsuario({ nome, email, senha })`)**:
   - **Política de senha forte** validada em tempo real no cadastro: mínimo de **8 caracteres**, **1 letra maiúscula**, **1 letra minúscula**, **1 número** e **1 caractere especial**.
   - Gera `salt` aleatório (16 bytes hex) via `crypto.getRandomValues`
   - Deriva `authHashHex` e `vaultKeyHex` via **Argon2id** (WebAssembly, 19 MiB RAM, 3 iterações, custo zero na Vercel — roda no navegador do usuário) combinado com **Pepper (`VITE_AUTH_PEPPER`) via HMAC-SHA256**
   - `authHashHex` no formato **PHC canônico** `$argon2id$v=19$m=19456,t=3,p=1$...` (OWASP: 19 MiB RAM, 3 iterações, paralelismo 1 — desestimula atacantes offline) → armazenado como `credencial_hash` no banco
   - `vaultKeyHex` (64 hex chars, 256 bits) → mantida apenas em memória/sessionStorage (nunca persistida)
   - A chave Gemini do usuário é **criptografada com AES-256-GCM** usando `vaultKeyHex` antes de ser salva como `gemini_key_cifrada`
   - **Isolamento de ideias por conta (`usuario_id`)**: todas as ideias salvas, listadas, favoritadas ou excluídas ficam vinculadas exclusivamente ao `usuario_id` da conta logada.
   - **Criptografia E2E de ideias**: quando autenticado, `descricao`, `tema` e `promptUsado` são cifrados com AES-256-GCM; `titulo` e `categoria` ficam em texto claro para busca.

2. **Login:** `loginUsuario({ email, senha })`:
   - Busca `credencial_hash` (PHC) do usuário pelo email
   - Extrai o `salt` diretamente do formato PHC (`extrairSaltDePHC`) e deriva `vaultKeyHex` para decifrar dados
   - Valida a senha via `verificarArgon2id()` (Argon2id + Pepper HMAC-SHA256)
   - Se válido, carrega `vaultKeyHex` em memória para decifrar a chave Gemini e as ideias salvas

3. **Chave Gemini:** `lerChave()` / `salvarChave()`:
   - Modo autenticado: chave fica **AES-256-GCM cifrada** com `vaultKeyHex`, armazenada como `gemini_key_cifrada`
   - Modo legado (sem login): chave em texto plano na tabela `configuracoes`
   - O servidor nunca vê a senha nem a chave Gemini em texto plano

### Histórico de Ideias

A tela de Histórico (`tela-historico.tsx`) permite organizar e filtrar as ideias salvas:

- **Filtrar por categoria**: clique em uma categoria (`App`, `Negócio`, `Conteúdo`, `Open Source`, `Hobby`) para visualizar apenas as ideias desta categoria.
- **Somente favoritas**: ative o badge "Somente favoritas" para exibir apenas as ideias marcadas como favorito.
- **Buscar**: digite um termo para buscar em título, descrição e tema das ideias (usando `LIKE` no SQL).
- Quando logado, o histórico mostra apenas as ideias do usuário ativo (`usuario_id`).

- `gerarSaltHex()` — salt aleatório de 16 bytes
- `derivarChaves(senha, saltHex, pepper?)` — **Argon2id** (WebAssembly, 19 MiB RAM, 3 iterações, custo zero na Vercel) + **Pepper via HMAC-SHA256** → `authHashHex` no formato **PHC canônico** `$argon2id$v=19$m=19456,t=3,p=1$...` (OWASP) + `vaultKeyHex` (64 hex chars / 256 bits para AES-256-GCM)
- `verificarArgon2id(senhaPeppered, phcHash)` — verifica senha contra hash PHC Argon2id (usado no login)
- `cifrarTexto(texto, chaveHex)` — AES-256-GCM com IV aleatório por operação (ciphertext único a cada chamada)
- `decifrarTexto(ciphertextHex, chaveHex)` — AES-256-GCM decrypt
- `constantTimeEquals(a, b)` — comparação em tempo constante

## Variáveis de ambiente

Crie `.env.local` (ou `.env`) na raiz do projeto:

```env
VITE_TURSO_DATABASE_URL=libsql://SEU-BANCO.turso.io
VITE_TURSO_AUTH_TOKEN=SEU_TOKEN_DE_LEITURA/GRAVACAO
VITE_AUTH_PEPPER=SEU_PEPPER_ALEATORIO
```

- `VITE_TURSO_DATABASE_URL` — URL do banco Turso (formato `libsql://...` ou `turso://...`)
- `VITE_TURSO_AUTH_TOKEN` — token de acesso (Pipeline v2 = escopo `read`, `write`)
- `VITE_AUTH_PEPPER` — pepper aleatório para derivação de chaves (Argon2id + HMAC-SHA256); nunca exposto ao usuário final

## Comandos

```bash
bun install              # instalar deps
bun run dev              # iniciar servidor de desenvolvimento (localhost:5173)
bun run build            # build de produção → dist/
bun run preview          # preview do build local
bun test                 # rodar testes
bun run typecheck        # verificar tipos TypeScript
```

## CI/CD

GitHub Actions em `.github/workflows/ci.yml` (`main` branch):

1. Checkout
2. Install Bun + deps
3. `tsc --noEmit` (type-safe)
4. `bun test` (testes)
5. `vite build` (build PWA)
6. Upload de `dist` como artifact

## Build

```bash
bun run build            # gera dist/
```

A PWA é servida como arquivos estáticos (Vercel, Netlify, Cloudflare Pages, etc).

## Edição de Perfil

Na tela de Configurações (`tela-configuracao.tsx`), o usuário autenticado pode:
- **Atualizar nome**: `atualizarNomeUsuario(novoNome)` — faz trim automático e atualiza o `nome` no banco + sessão local.
- **Trocar modelo Gemini**: `salvarModelo(modelo)` — persiste em `usuarios.gemini_modelo` (autenticado) ou `configuracoes` (legado).
- **Salvar/ler chave API**: `salvarChave(chave)` / `lerChave()` — AES-256-GCM cifrada com `vaultKeyHex` quando autenticado.

## Setup

1. `bun install`
2. Configure `.env.local` com suas credenciais do Turso
3. Crie uma chave no [Google AI Studio](https://aistudio.google.com/apikey)
4. Rode `bun run dev`
