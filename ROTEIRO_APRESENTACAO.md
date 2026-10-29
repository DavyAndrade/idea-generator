# Roteiro de Apresentação — Projeto Lumi

Guia oral e roteiro técnico estruturado para a defesa acadêmica do projeto **Lumi** (PWA de Geração Criativa com Inteligência Artificial, Arquitetura Serverless BFF e Criptografia Zero-Knowledge).

- **Autor:** Davy Andrade  
- **Duração total sugerida:** 10 a 12 minutos (+ tempo para demonstração ao vivo e perguntas da banca)  
- **Formato dos Slides:** 16:9 Widescreen ([`apresentacao-lumi.pdf`](./apresentacao-lumi.pdf))  

---

## ⏱️ Grade de Tempo & Mapeamento dos Assuntos

| Slide | Tópico Oficial Solicitado | Nome do Slide | Tempo Sugerido |
|:---:|---|---|:---:|
| **1** | Abertura | Capa do Projeto | 45s |
| **2** | **Acesso ao Vivo** | PWA em Produção: QR Code & Link Online | 45s |
| **3** | **Problema** | O Problema: Bloqueio Criativo e Riscos na Nuvem | 1m 15s |
| **4** | **Solução** | A Solução: Lumi — Inteligente, Privado e Portátil | 1m 15s |
| **5** | **Aplicativo** | O Aplicativo: PWA Moderno e Focado na Experiência (UX) | 1m 30s |
| **6** | **Arquitetura** | Arquitetura de Software: Padrão Serverless BFF | 1m 30s |
| **7** | **BD e /ou Web Service** | Persistência na Borda e Web Services RESTful | 1m 30s |
| **8** | **IA (desenvolver)** | Engenharia de IA: Prompts, Schemas e Integração REST | 1m 30s |
| **9** | Segurança & Privacidade | Segurança Criptográfica Zero-Knowledge (Argon2id + AES-GCM) | 1 min |
| **10** | Qualidade & Engenharia | Bateria de Testes, Métricas e Confiabilidade | 1 min |
| **11** | Conclusão & Demonstração | Conclusão do Projeto & Demonstração Prática | 1m 30s |

---

## 🎙️ Guia Slide a Slide

---

### Slide 1: Capa do Projeto
- **Tempo estimado:** 45s  
- **Elemento visual:** Título do Lumi com tags de tecnologias (React 19, TypeScript, TursoDB, Gemini, Argon2id, AES-256-GCM).

#### 🗣️ O que falar:
> "Boa noite a todos os professores e colegas. Hoje apresento o projeto **Lumi**, uma plataforma moderna de ideação criativa que une o poder da Inteligência Artificial Generativa com garantias reais de privacidade e soberania do usuário.
>
> O Lumi foi desenvolvido como um PWA de alta performance utilizando React 19, TypeScript, banco de dados distribuído na borda com TursoDB e um modelo de IA Bring Your Own Key diretamente com o Google Gemini.
>
> Ao longo desta apresentação, vou detalhar o problema que nos motivou, a solução desenvolvida, as funcionalidades do aplicativo, a arquitetura de software, o banco de dados e web services criados, o desenvolvimento da camada de IA e, por fim, como garantimos segurança ponta a ponta sem onerar os custos de infraestrutura."

#### 🎯 Destaque técnico:
- Enfatizar que se trata de uma aplicação **Full-Stack de nível de produção**, pronta para uso real na web.

---

### Slide 2: Acesso ao Vivo • PWA em Produção
- **Tempo estimado:** 45s  
- **Elemento visual:** QR Code de alta resolução em destaque, badge `● APLICAÇÃO DISPONÍVEL ONLINE`, link monoespaçado `https://lumi-gen.vercel.app/` e cartões informativos sobre PWA.

#### 🗣️ O que falar:
> "Antes de mergulharmos nos detalhes da arquitetura e da engenharia do sistema, convido a banca e os presentes a apontarem a câmera do celular para o **QR Code na tela**.
>
> A aplicação está 100% publicada e operacional na nuvem da Vercel no endereço `lumi-gen.vercel.app`. Como foi construída como uma Progressive Web App (PWA), ela abre instantaneamente no navegador do seu smartphone, sem precisar baixar nada de lojas de aplicativos.
>
> Fiquem à vontade para navegar e criar uma conta agora mesmo para acompanhar a experiência em tempo real enquanto apresento os próximos tópicos."

#### 🎯 Destaque técnico:
- Demonstração imediata de maturidade do projeto: software pronto, funcional, publicado e acessível de imediato.

---

### Slide 3: Problema
- **Tempo estimado:** 1m 15s  
- **Tópico Oficial:** **Problema**  
- **Elemento visual:** 3 cartões abordando Bloqueio Criativo, Privacidade e Custos/Lock-in.

#### 🗣️ O que falar:
> "Para entender o Lumi, precisamos olhar para três grandes gargalos que criadores, desenvolvedores e empreendedores enfrentam hoje:
>
> Primeiro, o **bloqueio criativo**. Muitas vezes temos uma centelha de ideia, mas temos dificuldade em transformá-la em uma proposta clara, com público-alvo, modelo viável e categoria mercadológica definida.
>
> Segundo, o **risco de privacidade e propriedade intelectual**. Quando recorremos a ferramentas comuns de IA na nuvem, nossos rascunhos de patentes, projetos sigilosos e planos de negócios são enviados em texto claro para servidores de terceiros. Isso cria uma vulnerabilidade grave de vazamento de propriedade intelectual.
>
> Terceiro, o **custo e a centralização**. Soluções corporativas cobram mensalidades caras de usuários individuais para cobrir custos de servidores de inferência que o próprio desenvolvedor poderia consumir por conta própria.
>
> Era necessário um sistema que resolvesse o processo criativo sem exigir que o usuário abrisse mão de sua privacidade e sem gerar uma fatura exorbitante de nuvem."

#### 🎯 Destaque técnico:
- Mostrar sensibilidade a problemas reais de mercado: segurança de dados sensíveis e economia de nuvem.

---

### Slide 4: Solução
- **Tempo estimado:** 1m 15s  
- **Tópico Oficial:** **Solução**  
- **Elemento visual:** 3 pilares da solução Lumi: Ideação Estruturada, BYOK e Zero-Knowledge.

#### 🗣️ O que falar:
> "A resposta a esse cenário é o **Lumi**. Ele entrega uma solução fundamentada em três pilares:
>
> 1. **Ideação Estruturada por IA:** Ao invés de uma resposta genérica em texto solto de chatbot, o Lumi utiliza IA generativa calibrada para entregar ideias ricas, já segmentadas em título, proposta de valor detalhada e categorização contextual.
>
> 2. **Modelo BYOK (Bring Your Own Key):** O Lumi adota a filosofia 'Traga sua Própria Chave'. O usuário insere sua chave de API gratuita do Google AI Studio. Isso garante autonomia total: sem intermediários lendo suas mensagens, sem limite imposto pela nossa plataforma e com custo zero de IA para quem hospeda o aplicativo.
>
> 3. **Soberania Zero-Knowledge:** Todas as credenciais de IA e o conteúdo confidencial das ideias são criptografados diretamente no navegador do usuário antes de serem transmitidos para o banco. O servidor armazena os dados, mas é matematicamente incapaz de ler seu conteúdo."

#### 🎯 Destaque técnico:
- Resolução simultânea de três dores: clareza na saída da IA, viabilidade financeira do projeto e conformidade com privacidade.

---

### Slide 5: Aplicativo
- **Tempo estimado:** 1m 30s  
- **Tópico Oficial:** **Aplicativo (PWA & UX)**  
- **Elemento visual:** 4 cartões com as telas: Geração de Ideias, Histórico com Filtros, Configurações e PWA/Dark Mode.

#### 🗣️ O que falar:
> "Entrando no **Aplicativo em si**, o Lumi foi concebido como um Progressive Web App (PWA) de alta responsividade, com design mobile-first e interface fluida:
>
> - **Onboarding e Autenticação Segura:** A tela de login e cadastro conta com validação de política de senha forte em tempo real (mínimo 8 caracteres, maiúscula, minúscula, número e símbolo), fornecendo feedback visual imediato ao usuário enquanto ele digita.
> - **Na Tela de Ideação**, o usuário é recebido com uma saudação personalizada e pode escolher entre categorias rápidas — como Aplicativos, Negócios, Criação de Conteúdo, Open Source e Hobbies — ou digitar um tema livre. A interface conta com micro-estados ricos do shadcn/ui: skeletons animados durante a inferência, badges estilizados e toasts de confirmação.
> - **Na Tela de Histórico**, o usuário tem acesso a todas as suas ideias salvas. Implementamos filtragem dinâmica por categoria, marcação de favoritos e uma barra de busca textual em tempo real. Como as ideias ficam cifradas no banco, a busca ocorre em memória de forma segura após a decifragem local.
> - **Na Tela de Configurações**, o usuário gerencia sua chave do Google Gemini de forma transparente, seleciona o modelo de linguagem desejado e conta com um botão de teste de conectividade em tempo real com o Google AI Studio.
> - **Experiência PWA:** O app conta com Service Worker ativo em estratégia cache-first para o shell e manifest instalado como aplicativo nativo tanto no smartphone quanto no desktop, além de alternância suave entre tema Claro e Escuro.
> - **Transição Arquitetural:** O ponto mais importante de usabilidade e segurança é que toda essa interface reativa **nunca** fala diretamente com o banco de dados. Tudo é mediado pela nossa arquitetura Serverless BFF, que veremos a seguir."

#### 🎯 Destaque técnico:
- Citar React 19, Tailwind CSS v4, componentes shadcn/ui (skeletons, badges, toasts, inputs controlados) e conformidade com padrões de acessibilidade e performance do Lighthouse.

---

### Slide 6: Arquitetura
- **Tempo estimado:** 1m 30s  
- **Tópico Oficial:** **Arquitetura de Software**  
- **Elemento visual:** Diagrama de 3 camadas: PWA Client, Serverless BFF e Persistência/IA Externa.

#### 🗣️ O que falar:
> "No que tange à **Arquitetura de Software**, optamos pelo padrão **Serverless BFF (Backend-For-Frontend)**, garantindo um desacoplamento estrito entre o cliente e o banco de dados:
>
> - **1. Camada de Apresentação (PWA):** Roda no navegador do usuário. É responsável pela renderização da interface, gerenciamento de estado via hooks nativos do React e, crucialmente, pela camada criptográfica Zero-Knowledge implementada em WebAssembly. O cliente **nunca** faz conexão direta com o banco de dados.
> - **2. Camada de Mediação (Serverless BFF):** São funções serverless hospedadas na Vercel sob rotas `/api/*`. O BFF é o único serviço que possui as credenciais para falar com o banco. Ele valida as requisições, gerencia sessões com tokens JWT assinados via HMAC-SHA256 e injeta o `usuario_id` autenticado em todas as queries.
> - **3. Camada de Persistência e IA Externa:** O banco de dados TursoDB fica isolado na borda. E para as chamadas de inferência de IA, o cliente comunica-se diretamente com a API do Google Gemini via REST, utilizando o cabeçalho `x-goog-api-key` com a chave do usuário decifrada estritamente na memória volátil da sessão."

#### 🎯 Destaque técnico:
- Blindagem total contra vazamento de credenciais: nenhuma chave de banco ou segredo de infraestrutura é embutida no bundle JavaScript do cliente.

---

### Slide 7: BD e /ou Web Service
- **Tempo estimado:** 1m 30s  
- **Tópico Oficial:** **BD e /ou Web Service**  
- **Elemento visual:** 2 blocos detalhados: TursoDB (Edge SQLite / Hrana v2) e Web Services Serverless (`/api/*`).

#### 🗣️ O que falar:
> "Aprofundando no **Banco de Dados e nos Web Services**, temos dois componentes fundamentais de infraestrutura:
>
> **1. Banco de Dados TursoDB:**
> - Trata-se de uma engine baseada em SQLite distribuído geograficamente na borda (Edge).
> - O grande diferencial técnico aqui foi a implementação do protocolo **Hrana v2 via HTTP Pipeline v2** sobre HTTPS. Não usamos drivers binários nativos pesados de C/C++ nem dependências desnecessárias; a comunicação é feita através de chamadas HTTP ultraleves e eficientes.
> - O banco adota um modelo relacional normalizado: tabela `usuarios` e tabela `ideias` vinculadas com integridade referencial via `FOREIGN KEY (usuario_id) REFERENCES usuarios(id)`.
> - **Criptografia Seletiva E2E:** Para conciliar busca performática com privacidade absoluta, os campos `titulo` e `categoria` trafegam e residem em texto claro, permitindo indexação e filtragem rápida, enquanto `descricao`, `tema` e `promptUsado` são cifrados com AES-256-GCM antes de tocar a rede.
> - O banco opera sob o princípio de confiança zero: armazena apenas hashes canônicos e ciphertexts criptografados.
>
> **2. Web Services RESTful (`/api/*`):**
> - Desenvolvemos endpoints serverless seguindo a especificação padrão Web Fetch API (`Request` e `Response` nativos).
> - As rotas `/api/auth/registrar`, `/api/auth/login` e `/api/auth/sessao` gerenciam o ciclo de vida do usuário sem trafegar senhas em texto puro.
> - O endpoint `/api/ideias` responde aos verbos `GET` (listar), `POST` (criar ideia com payload E2E), `PATCH` (favoritar recebendo `{ id, favorito }`) e `DELETE` (recebendo `?id=<id>` via query param), sempre validando o Bearer Token no cabeçalho `Authorization` e garantindo que o usuário só consiga visualizar e manipular suas próprias ideias."

#### 🎯 Destaque técnico:
- Ausência de dependência pesada de ORMs, uso do protocolo nativo Hrana v2 e garantia de isolamento multitenant no SQL.

---

### Slide 8: IA (desenvolver)
- **Tempo estimado:** 1m 45s  
- **Tópico Oficial:** **IA (desenvolver)**  
- **Elemento visual:** Engenharia de Prompt, Structured Outputs com JSON Schema e Integração REST.

#### 🗣️ O que falar:
> "Chegando ao coração do desenvolvimento de Inteligência Artificial do Lumi, vou explicar **como a camada de IA foi desenvolvida e calibrada**:
>
> **1. Engenharia de Prompts e System Instructions:**
> - Desenvolvemos um prompt de sistema especializado que instrui o modelo a assumir o papel de um estrategista sênior de inovação.
> - O prompt delimita a taxonomia de saída em cinco categorias mercadológicas pré-estabelecidas: `App`, `Negócio`, `Conteúdo`, `Open Source` e `Hobby`.
> - Aplicamos engenharia de restrições negativas: o modelo é explicitamente instruído a não utilizar saudações, preâmbulos, jargões vazios ou respostas abstratas, forçando uma proposta acionável e focada na dor do público.
>
> **2. Structured Outputs (Garantia de Esquema por JSON Schema):**
> - Um problema comum ao integrar LLMs é a alucinação de formato (Markdown quebrado, chaves JSON ausentes, etc.).
> - No Lumi, resolvemos isso no nível do motor da IA: ativamos o modo `responseMimeType: "application/json"` combinado com um `responseSchema` estrito da API Gemini v1beta.
> - A IA é matematicamente compelida a retornar um objeto JSON estritamente tipado contendo `titulo` (string concisa), `descricao` (texto aprofundado) e `categoria` (enum fechado). Isso elimina a necessidade de parsers frágeis de regex no frontend.
>
> **3. Arquitetura de Consumo sem Overhead:**
> - Desenvolvemos a integração via chamada HTTP REST direta contra o endpoint v1beta do Google AI Studio. Eliminamos centenas de kilobytes de SDKs oficiais desnecessários.
> - O usuário pode alternar dinamicamente entre 9 modelos suportados, com destaque para o `gemini-2.5-flash` (nosso modelo padrão com latência média inferior a 1 segundo) e suporte a modelos abertos de ponta como a família `gemma`."

#### 🎯 Destaque técnico:
- Domínio do recurso de **Structured Outputs** da API Gemini, garantindo 100% de previsibilidade na integração sem risco de falha de parsing.

---

### Slide 9: Segurança Zero-Knowledge & Criptografia
- **Tempo estimado:** 1 min  
- **Elemento visual:** Fluxo criptográfico: Senha -> Pepper -> Argon2id WASM -> vaultKeyHex -> AES-256-GCM -> TursoDB.

#### 🗣️ O que falar:
> "Para garantir que o usuário seja o único dono das suas criações, desenvolvemos uma arquitetura de segurança **Zero-Knowledge**:
>
> 1. No cadastro e login, o cliente executa o **Argon2id** compilado em WebAssembly rodando diretamente no browser do usuário, alocando 19 MiB de memória e 3 iterações. Ele gera o hash no formato canônico PHC padrão OWASP e o hash de autenticação com Pepper criptográfico (`HMAC-SHA256`). A senha plana nunca toca a rede nem os servidores.
> 2. O servidor valida a credencial via verificação de hash canônico sem jamais conhecer a senha original, inviabilizando ataques de dicionário ou tabelas rainbow mesmo em caso de vazamento da base de dados.
> 3. Uma chave simétrica `vaultKeyHex` de 256 bits é gerada e mantida estritamente na memória volátil da sessão do navegador. Ela é usada para cifrar a chave do Gemini e os campos sigilosos das ideias com algoritmo **AES-256-GCM**, com vetor de inicialização (IV) aleatório de 96 bits para cada registro.
>
> O servidor e o banco de dados só enxergam strings criptografadas aleatórias."

#### 🎯 Destaque técnico:
- Conformidade estrita com padrões OWASP e uso de criptografia simétrica autenticada (GCM).

---

### Slide 10: Qualidade, Testes e Confiabilidade
- **Tempo estimado:** 1 min  
- **Elemento visual:** 3 métricas de destaque: 101 testes Vitest, 0 erros TypeScript, build em ~1.3s.

#### 🗣️ O que falar:
> "A confiabilidade do Lumi foi garantida por engenharia de testes rigorosa:
>
> - Possuímos uma suíte com **101 testes automatizados passando no Vitest**, cobrindo todas as funções críticas: derivação de chaves criptográficas, verificação de adulteração de ciphertext no AES-GCM, isolamento de rotas no BFF e comunicação com a API do Gemini.
> - O código possui tipagem estrita com **0 erros de compilação no TypeScript** (`tsc --noEmit`).
> - O processo de build de produção com Vite leva apenas 1.3 segundos, gerando um bundle enxuto com Service Worker configurado para cache imediato dos recursos estáticos."

#### 🎯 Destaque técnico:
- Alta cobertura de testes em camadas críticas (criptografia e BFF), demonstrando disciplina de desenvolvimento e maturidade de software.

---

### Slide 11: Conclusão & Demonstração Prática
- **Tempo estimado:** 1m 30s  
- **Elemento visual:** Diferenciais do projeto, 4 passos da demonstração ao vivo e **QR Code interativo com link direto para o PWA em produção na Vercel (`https://lumi-gen.vercel.app/`)**.

#### 🗣️ O que falar:
> "Em conclusão, o Lumi atinge plenamente todos os objetivos propostos:
> - Resolve um **problema real** de bloqueio criativo;
> - Oferece um **aplicativo completo**, intuitivo e multiplataforma;
> - Utiliza um **banco de dados moderno na borda** e **web services serverless desacoplados**;
> - Implementa **desenvolvimento avançado de IA** com engenharia de prompts e Structured Outputs JSON;
> - E eleva o padrão de **privacidade** com segurança Zero-Knowledge e custo zero de infraestrutura de inferência.
>
> Vocês podem apontar a câmera do celular para o **QR Code exibido no slide** para abrir a aplicação em produção agora mesmo nos seus smartphones e acompanhar a demonstração em tempo real.
>
> Gostaria agora de conduzir uma breve demonstração prática no navegador, onde veremos o cadastro, a configuração da chave Gemini, a geração de uma nova ideia em tempo real e a inspeção dos dados criptografados salvos no banco.
>
> Muito obrigado pela atenção de todos e estou aberto às considerações da banca."

---

## 💡 Dicas de Ouro para a Demonstração Prática

Durante os 2 a 3 minutos da demonstração ao vivo:

1. **Passo 1 — Cadastro Rápido:**  
   Abra a aba de cadastro, mostre a validação de senha em tempo real (mínimo 8 caracteres, maiúscula, minúscula, número e símbolo) e crie uma conta de teste. Explique: *"Aqui o Argon2id já derivou a chave de cofre localmente em WebAssembly"*.
2. **Passo 2 — Conexão com Gemini (BYOK):**  
   Vá na aba Configurações, insira a chave do Google AI Studio e clique no botão de teste. Mostre o badge verde indicando conectividade imediata.
3. **Passo 3 — Geração da Ideia:**  
   Vá na tela principal, selecione a categoria `App` ou digite um tema como *"Gestão de tempo para estudantes"* e clique em **Gerar Ideia**. Mostre o resultado: título curto de impacto, descrição detalhada da dor/solução e classificação automática.
4. **Passo 4 — Histórico e Prova de Criptografia:**  
   Abra a aba Histórico, favorite a ideia gerada, filtre por categoria e, se o professor perguntar sobre segurança, abra a aba Rede (Network) do DevTools do navegador para mostrar que o payload enviado para `/api/ideias` tem a descrição cifrada em caracteres hexadecimais ininteligíveis.

---

## ❓ Possíveis Perguntas da Banca e Como Responder

### 1. *"Por que vocês escolheram o modelo BYOK ao invés de centralizar a chave da API no servidor?"*
> **Resposta:**  
> *"O modelo BYOK resolve dois problemas críticos simultaneamente: viabilidade econômica e privacidade. Com o BYOK, nosso custo operacional com inferência de IA é zero, permitindo que a plataforma escale infinitamente sem custos de nuvem para a universidade ou empresa. Além disso, a chave pertence ao usuário, garantindo que suas requisições não sejam intermediadas ou lidas por terceiros."*

### 2. *"Como vocês garantem que a IA nunca quebre o layout da aplicação com respostas inválidas?"*
> **Resposta:**  
> *"Utilizamos o recurso nativo de Structured Outputs da API Gemini v1beta com `responseMimeType: application/json` e `responseSchema`. O próprio motor de inferência da Google garante que cada token gerado respeite o esquema formal do JSON Schema, devolvendo estritamente os tipos definidos (string para título, string para descrição e enum fechado para categoria). Isso evita qualquer erro de parsing ou quebra de UI."*

### 3. *"Qual a vantagem de usar TursoDB via HTTP Pipeline em vez de uma biblioteca tradicional de banco de dados?"*
> **Resposta:**  
> *"O TursoDB utiliza o protocolo Hrana v2 sobre HTTPS através de requisições HTTP normais. Isso elimina a necessidade de compilar binários nativos de C/C++ ou drivers dependentes do sistema operacional nas funções serverless da Vercel, resultando em cold starts praticamente inexistentes, compatibilidade universal e latência ultra baixa com réplicas distribuídas na borda."*

### 4. *"Se o banco for invadido, o que o atacante consegue ver?"*
> **Resposta:**  
> *"Ele verá apenas o nome e email do usuário, o título da ideia e hashes canônicos PHC do Argon2id com Pepper de servidor. A descrição detalhada, o tema e a chave de API do Gemini estão cifrados com AES-256-GCM. Sem a senha mestre do usuário para derivar o vaultKey localmente, é matematicamente inviável decifrar o conteúdo protegido."*
