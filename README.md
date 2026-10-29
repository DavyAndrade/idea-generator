# Lumi

**Lumi** é um PWA (Progressive Web App) moderno que ilumina ideias criativas usando **Google Gemini** com arquitetura **BYOK** (Bring Your Own Key): o usuário informa a própria chave de API do Google AI Studio, protegida com criptografia ponta a ponta (`AES-256-GCM`) e autenticação Zero-Knowledge (`Argon2id` + `HMAC-SHA256 Pepper`).

---

## 🌟 Funcionalidades

- **Geração de Ideias Estruturadas**: Gera título, descrição detalhada e categorização contextualizada via Gemini Structured Outputs (JSON Schema).
- **Categorias Pré-definidas**: `App`, `Negócio`, `Conteúdo`, `Open Source` e `Hobby`.
- **BYOK (Bring Your Own Key)**: Custo zero de hospedagem para IA; o usuário conecta sua chave do Google AI Studio diretamente pelo app.
- **Segurança Zero-Knowledge**: A senha nunca sai do navegador em texto claro; as chaves de API e ideias confidenciais são cifradas localmente com AES-256-GCM.
- **Histórico & Favoritos**: Filtre por categorias, marque favoritas e busque termos em memória após decifrar os registros.
- **PWA & Offline Shell**: Instalável no celular ou desktop, com Service Worker cache-first para carregamento instantâneo.
- **Apresentação em Slides (PDF)**: Documento completo em slides 16:9 (`apresentacao-lumi.pdf`) para apresentações acadêmicas.

---

## 🛠️ Stack Tecnológica

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui
- **PWA**: Service Worker cache-first + `manifest.webmanifest`
- **Backend For Frontend (BFF)**: Vercel Serverless Functions (`/api/*`) com Web Fetch API
- **Banco de Dados**: TursoDB via HTTP Pipeline v2 (Hrana v2 sobre HTTPS)
- **Runtime & Testes**: Bun + Vitest (98 testes unitários passando)
- **IA**: Google Gemini REST v1beta (`gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.5-pro`, `gemini-3.5-flash`, `gemma-4-26b-it`, etc.)

---

## 🏛️ Arquitetura

```
src/
  lib/            # api-client.ts (BFF fetch), gemini.ts (REST), crypto.ts (Zero-Knowledge), storage.ts (CRUD), utils.ts
  components/     # TelaAuth, TelaGerar, TelaHistorico, TelaConfiguracao, AppBar, BannerSemChave, IdeiaCard
  components/ui/  # Primitivas shadcn/ui (Badge, Button, Card, Input)
  types.ts        # Tipos (Ideia, UsuarioSessao, ModeloGemini, Categorias)
  App.tsx         # Shell principal com navegação por abas
api/              # Serverless BFF: api/auth/*, api/ideias/*, api/usuario/* + api/_lib/
public/           # manifest.webmanifest, sw.js, icon.svg
apresentacao-lumi.html # Template HTML dos slides de apresentação (16:9)
apresentacao-lumi.pdf  # Slides compilados em PDF de alta resolução
vercel.json       # Configuração de deploy serverless na Vercel
```

**Fluxo de Dados:** Tela React → `lib/storage.ts` (`fetchApi` com JWT Bearer) → `/api/*` BFF → TursoDB (Pipeline v2). O cliente nunca expõe credenciais de banco de dados.

---

## 🔒 Autenticação e Criptografia Zero-Knowledge

1. **Cadastro (`TelaAuth`)**:
   - Política de senha forte em tempo real (mínimo 8 caracteres, maiúscula, minúscula, número e caractere especial).
   - Derivação no navegador via **Argon2id (WebAssembly)** com 19 MiB RAM e 3 iterações.
   - Aplicação de **Pepper secreto via HMAC-SHA256**.
   - Armazena `credencial_hash` em formato **PHC canônico** (`$argon2id$v=19$m=19456,t=3,p=1$...`) no TursoDB.
   - Gera chave simétrica `vaultKeyHex` (256 bits) mantida estritamente em memória do navegador.

2. **Criptografia E2E de Dados**:
   - Chave Gemini do usuário cifrada com `AES-256-GCM` (`gemini_key_cifrada`).
   - Ideias do usuário: `descricao`, `tema` e `promptUsado` são cifrados antes de salvar; `titulo` e `categoria` permanecem legíveis para filtragem inicial.
   - Isolamento total por `usuario_id` em todas as rotas da API.

---

## 🚀 Comandos

Executados na raiz do projeto:

```bash
bun install              # Instalar dependências
bun run dev              # Servidor de desenvolvimento com proxy BFF (localhost:5173)
bun run build            # Build de produção do PWA (dist/)
bun run preview          # Preview local do build de produção
bun test                 # Executar bateria de testes (Vitest)
bun x tsc --noEmit       # Verificação estrita de tipos TypeScript
```

Para gerar novamente os slides em PDF:
```bash
chromium --headless --no-sandbox --disable-gpu --user-data-dir=/tmp/chromium-pdf --print-to-pdf=apresentacao-lumi.pdf file://$(pwd)/apresentacao-lumi.html
```

---

## 🌐 Deploy na Vercel

O projeto possui configuração pronta em [`vercel.json`](./vercel.json) para servir o PWA estático e as Serverless Functions (`/api/*`).

### Variáveis de Ambiente na Vercel (Production)

| Variável | Descrição |
|---|---|
| `TURSO_DATABASE_URL` | URL do banco Turso (`libsql://seu-banco.turso.io`) |
| `TURSO_AUTH_TOKEN` | Token de autorização com permissão de leitura/gravação |
| `AUTH_PEPPER` | String aleatória secreta para o HMAC-SHA256 do Argon2id |
| `JWT_SECRET` | Segredo para assinatura dos tokens de sessão JWT |

---

## 📄 Apresentação Acadêmica

Os slides prontos para apresentação na faculdade estão disponíveis em:
- [Visualizar Slides (PDF)](./apresentacao-lumi.pdf) (8 slides widescreen 16:9)
- [Código-fonte dos Slides (HTML)](./apresentacao-lumi.html)
