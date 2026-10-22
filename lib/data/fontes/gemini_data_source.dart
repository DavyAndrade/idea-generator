import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../core/constantes.dart';
import '../../core/excecoes.dart';
import '../../domain/entidades/ideia.dart';

/// Cliente REST do Gemini. Recebe a chave por chamada (BYOK).
class GeminiDataSource {
  GeminiDataSource({http.Client? cliente})
    : _cliente = cliente ?? http.Client();

  final http.Client _cliente;

  Future<Ideia> gerar({
    required String tema,
    required String categoria,
    required String chave,
    String modelo = Constantes.modeloPadrao,
  }) {
    final uri = Uri.parse(
      '${Constantes.geminiBaseUrl}/$modelo:generateContent',
    );

    final body = jsonEncode({
      'contents': [
        {
          'parts': [
            {
              'text':
                  'Você é um gerador de ideias criativas. Gere 1 ideia de "$categoria" sobre o tema "$tema". '
                  'A ideia deve ser específica, viável e acionável.',
            },
          ],
        },
      ],
      'generationConfig': {
        'responseMimeType': 'application/json',
        'responseSchema': {
          'type': 'object',
          'properties': {
            'titulo': {'type': 'string'},
            'descricao': {'type': 'string'},
          },
          'required': ['titulo', 'descricao'],
        },
      },
    });

    return _post(uri, body, chave, tema, categoria);
  }

  Future<Ideia> _post(
    Uri uri,
    String body,
    String chave,
    String tema,
    String categoria,
  ) async {
    late final http.Response resp;
    try {
      resp = await _cliente
          .post(
            uri,
            headers: {
              'x-goog-api-key': chave,
              'Content-Type': 'application/json',
            },
            body: body,
          )
          .timeout(const Duration(seconds: 60));
    } on Exception catch (e) {
      throw RedeExcecao('Sem conexão com o Gemini.', causa: e);
    }

    if (resp.statusCode == 400 || resp.statusCode == 403) {
      throw ChaveApiExcecao('Chave de API inválida ou sem permissão.');
    }
    if (resp.statusCode != 200) {
      throw RedeExcecao(
        'Erro do Gemini (HTTP ${resp.statusCode}).',
        statusCode: resp.statusCode,
      );
    }

    try {
      final json = jsonDecode(resp.body) as Map<String, dynamic>;
      final texto =
          (json['candidates'] as List).first['content']['parts'][0]['text']
              as String;
      final dados = jsonDecode(texto) as Map<String, dynamic>;
      return Ideia(
        titulo: dados['titulo'] as String,
        descricao: dados['descricao'] as String,
        tema: tema,
        categoria: categoria,
        promptUsado: body,
        criadoEm: DateTime.now(),
      );
    } on Exception catch (e) {
      throw RespostaInvalidaExcecao(
        'Resposta do Gemini não interpretável.',
        causa: e,
      );
    }
  }

  void dispose() => _cliente.close();
}
