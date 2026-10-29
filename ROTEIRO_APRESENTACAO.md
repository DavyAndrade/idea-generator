# Roteiro de Apresentação — Projeto Lumi

Guia prático, amigável e direto ao ponto para a apresentação do projeto **Lumi** (Atividade AP5 - 5PDM).  
Linguagem pensada para falar com naturalidade, segurança e clareza para a banca e colegas.

- **Apresentador:** Davy Andrade  
- **Duração recomendada:** 10 a 12 minutos (+ tempo para a demonstração prática)  
- **Slides de apoio:** 16:9 Widescreen ([`apresentacao-lumi.pdf`](./apresentacao-lumi.pdf))  
- **Aplicação no ar:** [lumi-gen.vercel.app](https://lumi-gen.vercel.app/)

---

## ⏱️ Mapa Rápido dos Slides (11 Slides)

| # | Assunto Oficial | O que você vai falar em 1 frase | Tempo |
|:---:|---|---|:---:|
| **1** | **Abertura** | Quem sou eu e o que é o Lumi: gerador de ideias com IA e privacidade. | 45s |
| **2** | **Acesso ao Vivo** | Convite para a banca ler o QR Code e abrir o app no celular agora. | 45s |
| **3** | **Problema** | Bloqueio criativo, medo de ter ideias roubadas e IA cara. | 1m 15s |
| **4** | **Solução** | Ideias estruturadas, IA gratuita (BYOK) e cofre criptografado. | 1m 15s |
| **5** | **Aplicativo** | As telas do PWA, temas, filtros e a nova proteção contra perda de ideias. | 1m 30s |
| **6** | **Arquitetura** | O modelo BFF em 3 camadas: navegador, funções serverless e nuvem. | 1m 30s |
| **7** | **BD e Web Services** | Banco TursoDB na borda e endpoints REST protegidos por token. | 1m 30s |
| **8** | **IA (desenvolver)** | Como domamos o Gemini com prompts e JSON Schema sem bibliotecas pesadas. | 1m 30s |
| **9** | **Segurança** | Criptografia Zero-Knowledge explicada de forma simples e visual. | 1 min |
| **10** | **Qualidade & Testes** | 103 testes automatizados, TypeScript 100% estrito e build em 1 segundo. | 1 min |
| **11** | **Conclusão & Demo** | Resumo dos ganhos e início da demonstração ao vivo no navegador. | 2 a 3 min |

---

## 🎙️ Guia Slide a Slide: Como Falar com Naturalidade

---

### Slide 1: Capa do Projeto
- **Visual:** Título do Lumi, tecnologias usadas e identificação (Davy Andrade • Atividade AP5 - 5PDM).

#### 🗣️ Como falar (simples e acolhedor):
> "Boa noite, professores e colegas!
>
> Hoje vou apresentar para vocês o **Lumi**, uma aplicação que desenvolvi para resolver um problema muito comum: o bloqueio criativo na hora de criar novos projetos.
>
> O Lumi combina o poder dos modelos de inteligência artificial mais modernos da Google com um compromisso sério: **privacidade total do usuário**. Tudo isso construído como uma aplicação web progressiva (PWA), rápida, responsiva e pronta para uso em produção.
>
> Vamos passar juntos pelo problema, pela solução, pela arquitetura técnica, pelo desenvolvimento da IA e fechar com uma demonstração prática ao vivo."

---

### Slide 2: Acesso ao Vivo (PWA na Vercel)
- **Visual:** QR Code grande e nítido, link `https://lumi-gen.vercel.app/` e aviso de PWA online.

#### 🗣️ Como falar (interativo e confiante):
> "Antes de entrarmos no código e na arquitetura, eu quero fazer um convite para vocês:
>
> Se quiserem, **apontem a câmera do celular para o QR Code** que está aí na tela.
>
> O Lumi já está 100% publicado e funcionando na Vercel no endereço `lumi-gen.vercel.app`. Como ele é um PWA, vocês não precisam baixar nada da loja de aplicativos — ele abre direto no navegador do smartphone com visual de aplicativo nativo.
>
> Vocês podem criar uma conta de teste agora mesmo para acompanhar a experiência em tempo real enquanto eu apresento os próximos tópicos."

💡 *Dica:* Dê uns 10 a 15 segundos para quem quiser apontar o celular antes de passar para o slide seguinte.

---

### Slide 3: O Problema
- **Tópico Oficial:** **Problema**  
- **Visual:** 3 pontos de dor: Bloqueio Criativo, Riscos de Privacidade e Custos de Nuvem.

#### 🗣️ Como falar (conectando com a dor real):
> "Todo mundo que cria projetos — seja um estudante, um desenvolvedor ou um empreendedor — já passou por isso:
>
> 1. **O bloqueio criativo:** Você tem uma vaga ideia na cabeça, mas trava na hora de transformá-la em algo concreto, com público-alvo, nicho e proposta de valor definidos.
> 2. **O medo do vazamento:** Quando a gente joga rascunhos de projetos sigilosos em chats normais de IA na internet, essas ideias ficam salvas em texto puro nos servidores de outras empresas. Ninguém quer ter sua ideia de negócio ou startup exposta.
> 3. **E o custo:** As ferramentas prontas cobram mensalidades caras porque precisam pagar servidores gigantescos para rodar os modelos.
>
> O desafio era claro: como criar uma ferramenta de ideação inteligente, que seja acessível a qualquer pessoa e que garanta que **nem mesmo nós, os criadores do app**, possamos bisbilhotar as ideias dos usuários?"

---

### Slide 4: A Solução (Lumi)
- **Tópico Oficial:** **Solução**  
- **Visual:** Os 3 pilares: Ideação Estruturada, BYOK e Criptografia Zero-Knowledge.

#### 🗣️ Como falar (claro e direto):
> "A nossa resposta foi o **Lumi**, desenhado em cima de três ideias muito simples:
>
> - **Primeiro, Ideação Estruturada:** Em vez de respostas longas e confusas de um chat comum, o Lumi entrega a ideia mastigada: um título de impacto, uma descrição completa com a dor e a solução, e a categoria certa (App, Negócio, Conteúdo, etc.).
> - **Segundo, Modelo BYOK (Traga sua Própria Chave):** O usuário usa a sua própria chave gratuita do Google AI Studio. Isso traz duas grandes vantagens: o usuário tem cota própria e nós temos **custo zero** de infraestrutura com IA.
> - **E terceiro, Segurança Zero-Knowledge:** Todas as informações sigilosas são trancadas com chave criptográfica dentro do navegador do usuário antes de viajar pela internet. O banco de dados guarda apenas códigos cifrados ininteligíveis."

---

### Slide 5: O Aplicativo (PWA & Experiência do Usuário)
- **Tópico Oficial:** **Aplicativo**  
- **Visual:** As 4 frentes: Geração de Ideias, Histórico com Filtros, Configurações/BYOK e PWA/Dark Mode.

#### 🗣️ Como falar (mostrando o carinho com o usuário):
> "Falando agora do aplicativo em si, ele foi construído pensando no uso diário no celular e no computador:
>
> - **Na tela inicial de Ideação:** O usuário escolhe a categoria com um clique ou digita o tema que quiser. Um detalhe importante que implementamos: **a ideia gerada não se perde**. Ela fica guardada com segurança no armazenamento local do navegador (`localStorage`) até que o usuário decida salvar no histórico ou descartar, mesmo que ele mude de aba ou recarregue a página sem querer.
> - **No Histórico:** Todas as ideias salvas ficam acessíveis com busca instantânea por texto, filtro por categoria e marcação de favoritas.
> - **Nas Configurações:** O usuário gerencia sua chave do Gemini, testa a conexão em tempo real e escolhe entre os modelos da família Flash (do 2.5 ao 3.8).
> - **E o visual:** O app suporta modo claro e escuro, tem animações de carregamento (skeletons) e funciona até offline para o carregamento da interface graças ao Service Worker."

---

### Slide 6: Arquitetura de Software (Serverless BFF)
- **Tópico Oficial:** **Arquitetura**  
- **Visual:** Diagrama das 3 camadas: Navegador (PWA), Servidor (BFF na Vercel) e Nuvem (TursoDB + Gemini).

#### 🗣️ Como falar (mostrando maturidade de engenharia):
> "Aqui está a espinha dorsal do projeto. A gente adotou o padrão **BFF (Backend-For-Frontend)** em três camadas bem isoladas:
>
> 1. **Camada 1 — O Cliente (PWA):** Roda 100% no navegador. É ele quem cuida da tela e de toda a criptografia em WebAssembly. Importante frisar: **o navegador nunca toca diretamente no banco de dados**.
> 2. **Camada 2 — O BFF Serverless:** São pequenas funções na Vercel sob a rota `/api/*`. Ele funciona como um segurança: confere quem está logado usando tokens JWT e é o único que tem permissão para falar com o banco de dados.
> 3. **Camada 3 — Persistência e IA Externa:** O banco de dados TursoDB fica isolado na nuvem. E a IA do Gemini é chamada diretamente pelo cliente via REST usando a chave do próprio usuário mantida na memória da sessão.
>
> Essa separação impede qualquer vazamento de segredos de banco de dados para o frontend."

---

### Slide 7: Banco de Dados e Web Services
- **Tópico Oficial:** **BD e /ou Web Service**  
- **Visual:** TursoDB (Edge SQLite via Hrana v2) e Endpoints da API REST (`/api/*`).

#### 🗣️ Como falar (desmistificando os termos difíceis):
> "No banco de dados e nos serviços web, tomamos decisões focadas em leveza e velocidade:
>
> - **O Banco de Dados (TursoDB):** Usamos o Turso, que é uma tecnologia baseada em SQLite distribuída globalmente perto do usuário. O grande trunfo técnico aqui foi usar o protocolo **Hrana v2 via HTTP**. Em português claro: não precisamos instalar bibliotecas pesadas de banco em C ou C++; o banco conversa via requisições HTTP normais, leves e quase instantâneas.
> - **Criptografia Seletiva:** Para o banco poder buscar rápido, deixamos o título e a categoria legíveis. Mas a descrição detalhada, o tema e o prompt original são salvos como blocos criptografados ilegíveis.
> - **Os Web Services (`/api/*`):** Criamos endpoints REST completos:
>   - `/api/auth/registrar`, `login` e `sessao` para gerenciar a conta;
>   - `/api/ideias` com suporte a listar (GET), salvar (POST), favoritar (PATCH) e excluir (DELETE);
>   - E rotas de configuração para perfil e troca de modelo.
>   Tudo validado com token de sessão, garantindo que um usuário nunca acesse as ideias de outro."

---

### Slide 8: Desenvolvimento de IA
- **Tópico Oficial:** **IA (desenvolver)**  
- **Visual:** Engenharia de Prompt, Structured Outputs com JSON Schema e Modelos Flash.

#### 🗣️ Como falar (destaque do trabalho de inteligência artificial):
> "Chegando no ponto alto: **como a inteligência artificial foi desenvolvida**:
>
> - **1. Engenharia de Prompts:** Nós não jogamos uma pergunta solta para o modelo. Desenvolvemos instruções de sistema que colocam a IA no papel de um consultor sênior de inovação. Colocamos regras negativas rígidas: nada de saudações vazias como *'Olá, que ótima ideia!'*, nada de jargões corporativos sem sentido. A resposta precisa ser prática, direta e dividida nas 5 categorias do mercado.
> - **2. Structured Outputs (Garantia de Esquema JSON):** Esse é o recurso mais sofisticado que usamos. Quem já trabalhou com IA sabe que às vezes ela devolve um texto quebrado que faz a tela travar. No Lumi, configuramos o Gemini com **JSON Schema estrito**. A IA é obrigada pelo próprio motor da Google a devolver um JSON perfeito contendo título, descrição e categoria. Não usamos nenhuma gambiarra de regex no frontend.
> - **3. Chamadas REST Diretas:** Em vez de usar SDKs pesados de centenas de kilobytes, fazemos a chamada HTTP pura para a API v1beta do Gemini. E o usuário pode alternar livremente entre 5 modelos de altíssima velocidade da família Flash."

---

### Slide 9: Segurança Zero-Knowledge e Criptografia
- **Visual:** Passo a passo visual: Senha ➔ Argon2id ➔ Chave de Cofre ➔ AES-256-GCM.

#### 🗣️ Como falar (didático com a analogia do cofre):
> "Vou explicar a nossa segurança de um jeito que qualquer pessoa entende:
>
> Imaginem um cofre onde só você tem a chave. Se você entregar esse cofre trancado para um banco guardar, o gerente do banco não sabe e nem tem como descobrir o que tem lá dentro.
>
> É exatamente isso que o Lumi faz:
> 1. Quando o usuário digita sua senha, o navegador roda um algoritmo de ponta chamado **Argon2id** via WebAssembly. A senha nunca viaja pela rede; o que viaja é apenas um hash canônico com um segredo adicional do servidor (Pepper).
> 2. No mesmo instante, o navegador gera uma **chave de cofre de 256 bits** que fica apenas na memória da aba.
> 3. Essa chave cifra as ideias e a chave da API com **AES-256-GCM** — o mesmo padrão usado por instituições bancárias.
>
> Se um invasor invadir o banco de dados hoje, ele só vai encontrar uma sopa de letras e números criptografados. Nem nós conseguimos ler."

---

### Slide 10: Qualidade, Testes e Confiabilidade
- **Visual:** 3 números principais: 103 testes passando, 0 erros de tipo, build em 1.4s.

#### 🗣️ Como falar (demonstrando seriedade técnica):
> "Para garantir que nada quebre na mão do usuário, investimos pesado em testes automatizados:
>
> - Temos hoje **103 testes automatizados rodando e passando com 100% de sucesso no Vitest**. Eles testam a criptografia ponta a ponta, os endpoints da API, a persistência de ideias pendentes e o cliente do Gemini.
> - O código está em TypeScript com checagem estrita: **zero erros de compilação**.
> - E o processo de compilação do Vite leva apenas 1.4 segundos, gerando arquivos ultracompactos."

---

### Slide 11: Conclusão & Demonstração ao Vivo
- **Visual:** Diferenciais alcançados, os 4 passos da demonstração e QR Code de encerramento.

#### 🗣️ Como falar (fechando com chave de ouro):
> "Em resumo, o Lumi entrega:
> - Um **problema real resolvido**;
> - Um **aplicativo PWA completo e funcional**;
> - Uma **arquitetura moderna desacoplada** com banco na borda;
> - Um **uso profissional de IA com esquemas estruturados**;
> - E **privacidade soberana com custo zero de inferência**.
>
> Agora, convido os professores para vermos o Lumi funcionando na prática no navegador."

---

## 🎬 Roteiro Prático da Demonstração ao Vivo (2 a 3 Minutos)

Tenha o navegador aberto em [lumi-gen.vercel.app](https://lumi-gen.vercel.app/) em uma aba anônima ou limpa:

1. **Passo 1 — Cadastro com Senha Forte:**
   - Clique em *"Criar conta"*.
   - Digite seu nome, e-mail e comece a digitar uma senha fraca (ex: `12345`). Mostre a lista visual de requisitos acendendo em verde um a um conforme você adiciona maiúscula, minúscula, número e símbolo.
   - *Fala:* "Aqui o checklist de senha guia o usuário em tempo real, e o Argon2id já prepara a chave de cofre local."
2. **Passo 2 — Configuração da Chave Gemini (BYOK):**
   - Entre no app, vá na aba **Configurações**.
   - Cole uma chave de teste do Google AI Studio e clique em **Testar Conexão**. Mostre a resposta de sucesso com badge verde.
   - *Fala:* "A chave é testada ao vivo contra os servidores da Google e salva cifrada com AES-256-GCM."
3. **Passo 3 — Gerar uma Ideia em Tempo Real:**
   - Volte para a aba **Gerar**.
   - Selecione a tag **App** e digite um tema como: *"Controle de hábitos com gamificação"*.
   - Clique em **Gerar ideia**. Aguarde 1 a 2 segundos enquanto a barra animada processa.
   - Mostre o resultado: título limpo, proposta detalhada e categoria selecionada.
   - *Destaque:* Mude para a aba de Configurações e volte para a aba Gerar. Mostre que a ideia continua intacta lá! Explique: *"Implementamos persistência local para que o usuário nunca perca a ideia gerada se trocar de aba sem querer"*.
4. **Passo 4 — Salvar e Ver no Histórico:**
   - Clique no botão **Salvar**. Mostre a notificação toast *"Salvo no histórico"*.
   - Vá para a aba **Histórico**, favorite a ideia com a estrelinha e faça uma busca rápida na caixinha de pesquisa.
   - *Fala para encerrar:* "Pronto! A ideia foi salva no TursoDB com descrição cifrada e descriptografada na hora na nossa máquina."

---

## 🛡️ Respostas Rápidas para Perguntas da Banca

**Pergunta 1: "Por que vocês usaram BYOK em vez de colocar a chave no servidor?"**  
> *"Por dois motivos simples: viabilidade e privacidade. Se colocássemos a chave no servidor, teríamos que pagar pela IA de todos os usuários ou cobrar mensalidade. Com o BYOK, nosso custo é zero e o app pode crescer sem limites. Além disso, nenhuma consulta passa por servidores intermediários nossos."*

**Pergunta 2: "Como vocês têm certeza de que a IA não vai inventar um formato maluco que quebre a tela?"**  
> *"Usamos o recurso nativo de Structured Outputs da API Gemini com `responseSchema`. Não pedimos em texto livre; nós passamos um contrato JSON estrito. O próprio motor da Google garante que a resposta venha com campos tipados: título curto, descrição longa e categoria restrita."*

**Pergunta 3: "O que é esse tal de Hrana v2 do TursoDB?"**  
> *"O Hrana v2 é o protocolo oficial do Turso para falar com o banco através de requisições HTTP normais. A vantagem prática é que não precisamos de drivers pesados de C++ ou compilações nativas nas funções serverless da Vercel. É leve, rápido e funciona em qualquer ambiente."*

**Pergunta 4: "Se alguém conseguir invadir o banco de dados, o que ele consegue roubar?"**  
> *"Ele verá apenas nomes, e-mails, títulos das ideias e hashes criptográficos canônicos do Argon2id. O conteúdo detalhado das ideias e a chave de API do usuário estão cifrados com AES-256-GCM. Sem a senha original do usuário, que nunca é salva em lugar nenhum, é matematicamente impossível decifrar."*
