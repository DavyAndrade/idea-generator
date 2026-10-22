# Gerador de Ideias

App Android (Flutter) que gera ideias criativas usando Gemini com BYOK:
o usuário informa a própria chave de API do Google AI Studio.

## Stack

- Flutter 3.44.x / Dart 3.12.x — foco Android
- SQLite via `sqflite` (histórico local de ideias)
- `flutter_secure_storage` — chave API no Keystore
- Gemini REST direto (`gemini-2.5-flash`), sem SDK oficial
- `provider` + `ChangeNotifier` — estado

## Arquitetura

Clean Architecture em 3 camadas:

```
lib/
  core/          # Resultado<T>, exceções, constantes
  domain/        # entidade Ideia, interface IdeiaRepository, casos de uso
  data/          # models, datasources (SQLite + Gemini), repo impl
  presentation/  # providers, telas, widgets
```

Fluxo: tela → caso de uso → repositório (interface) → datasource.

## Funcionalidades (MVP)

1. **Gerar ideia** — tema livre + categoria (App, Negócio, Conteúdo, Open Source, Hobby)
2. **Histórico** — ideias salvas, favoritos, busca, excluir
3. **Configuração** — chave API (obscured), teste de conexão, modelo

## Regras

- Sem backend: app fala direto com Gemini (BYOK)
- Sem ORM: sqflite com SQL explícito
- Sem get_it: DI manual em main.dart
- Labels em pt-BR

## Commands

```bash
flutter pub get
flutter analyze
flutter test
flutter run
flutter build apk --debug
```

## Setup

1. `flutter pub get`
2. Rode no emulador/dispositivo: `flutter run`
3. Abra Configuração e cole sua chave do Google AI Studio
   (https://aistudio.google.com/apikey)
