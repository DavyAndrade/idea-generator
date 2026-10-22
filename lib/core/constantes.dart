/// Constantes do app.
abstract final class Constantes {
  static const String geminiBaseUrl =
      'https://generativelanguage.googleapis.com/v1beta/models';

  /// Modelo padrão; usuário pode trocar nas configurações.
  static const String modeloPadrao = 'gemini-2.5-flash';

  static const List<String> modelosDisponiveis = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.5-pro',
  ];

  static const List<String> categorias = [
    'App',
    'Negócio',
    'Conteúdo',
    'Open Source',
    'Hobby',
  ];
}
