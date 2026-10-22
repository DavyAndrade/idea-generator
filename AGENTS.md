# AGENTS.md

## Project

Gerador de Ideias — app Flutter Android. Gera ideias via Gemini BYOK.
Repositório: /home/davy/Desenvolvimento/Projetos/GeradorDeIdeias

## Commands

- `flutter pub get` — deps
- `flutter analyze` — lint (deve sair 0 issues antes de commitar)
- `flutter test` — testes (deve passar antes de commitar)
- `flutter build apk --debug` — smoke build (requer JDK 17+)
- `dart format lib test` — formatação

## JDK p/ build do APK

Máquina sem JDK do sistema (sudo pede senha). JDK portátil já baixado em
`~/jdks/jdk-17.0.21+9`. Antes de `flutter build apk`:

```bash
export JAVA_HOME=/home/davy/jdks/jdk-17.0.21+9
export PATH="$JAVA_HOME/bin:$PATH"
```

Se a pasta não existir, o README tem o comando de download (Adoptium 17, sem sudo).

## Stack decisions (não mudar sem pedido explícito)

- SQLite via `sqflite` puro — NÃO drift/orm
- Gemini via REST (`http`) — NÃO SDK google_generative_ai
- Chave API em `flutter_secure_storage` — NÃO SharedPreferences
- Estado: `provider` — NÃO riverpod/bloc
- DI manual no main.dart — NÃO get_it/kiwi
- Idioma: labels e comentários em pt-BR
- Sem backend/web service/Mongo — BYOK, app fala direto com API

## Architecture

Clean Architecture, dependências apontam só para dentro (domain não importa data/presentation):

- domain/: entidade pura `Ideia`, interface `IdeiaRepository`, casos de uso (1 classe = 1 ação)
- data/: `IdeiaModel extends Ideia`, `IdeiaLocalDataSource` (sqflite), `GeminiDataSource` (REST + responseSchema JSON), `IdeiaRepositoryImpl`
- presentation/: `IdeiaProvider extends ChangeNotifier`, telas, widgets
- core/: `Resultado<T>` (Success/Failure), exceções tipadas

Regra: tela nunca fala com datasource direto — sempre via caso de uso.
Caso de uso retorna `Resultado<T>`, nunca lança exceção.

## Gemini integration

- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent`
- Auth: header `x-goog-api-key`
- Sempre pedir `generationConfig.responseMimeType: application/json` + `responseSchema` com campos {titulo, descricao, categoria} — sem parse de texto livre
- Modelo padrão: `gemini-2.5-flash`; usuário pode trocar nas configurações
- Sem chave configurada → UI mostra banner, não tenta chamar API

## SQLite

Tabela `ideias`:

```
id INTEGER PK AUTOINCREMENT, titulo TEXT, descricao TEXT, tema TEXT,
categoria TEXT, prompt_usado TEXT, favorito INTEGER DEFAULT 0, criado_em TEXT
```

Migração: bump `databaseVersion` + switch em onCreate/onUpgrade.

## Testing

- Unit: casos de uso + GeminiDataSource (mock HTTP via http.testing)
- Unit: IdeiaRepositoryImpl com sqflite_common_ffi (SQLite real em memória)
- Widget: tela de gerar com provider mockado
- Rodar: `flutter test`

## Conventions

- Arquivos em snake_case; classes em PascalCase
- Um caso de uso por arquivo
- Erros: exceções tipadas em core/, convertidas em Resultado nos casos de uso
- Nada de comentário de código explicando o óbvio (comentário `ponytail:` ok p/ atalho deliberado)
- Commit: Conventional Commits, pt-BR, ex: `feat: tela de gerar ideias`
