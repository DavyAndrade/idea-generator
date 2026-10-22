import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:gerador_de_ideias/core/excecoes.dart';
import 'package:gerador_de_ideias/data/fontes/gemini_data_source.dart';

String _corpoOk() => jsonEncode({
  'candidates': [
    {
      'content': {
        'parts': [
          {
            'text': jsonEncode({
              'titulo': 'Título X',
              'descricao': 'Descrição Y',
            }),
          },
        ],
      },
    },
  ],
});

void main() {
  test('retorna Ideia a partir de resposta JSON válida', () async {
    late http.Request capturado;

    final gemini = GeminiDataSource(
      cliente: MockClient((request) async {
        capturado = request;
        return http.Response(_corpoOk(), 200);
      }),
    );

    final ideia = await gemini.gerar(
      tema: 'plantas',
      categoria: 'App',
      chave: 'chave-teste',
      modelo: 'gemini-2.5-flash',
    );

    expect(ideia.titulo, 'Título X');
    expect(ideia.descricao, 'Descrição Y');
    expect(ideia.tema, 'plantas');
    expect(ideia.categoria, 'App');
    expect(capturado.headers['x-goog-api-key'], 'chave-teste');
    expect(
      capturado.url.toString(),
      contains('models/gemini-2.5-flash:generateContent'),
    );
  });

  test('lança ChaveApiExcecao em 403', () async {
    final gemini = GeminiDataSource(
      cliente: MockClient((_) async => http.Response('Forbidden', 403)),
    );

    expect(
      () => gemini.gerar(tema: 't', categoria: 'c', chave: 'ruim'),
      throwsA(isA<ChaveApiExcecao>()),
    );
  });

  test('lança RedeExcecao em 500', () async {
    final gemini = GeminiDataSource(
      cliente: MockClient((_) async => http.Response('boom', 500)),
    );

    expect(
      () => gemini.gerar(tema: 't', categoria: 'c', chave: 'k'),
      throwsA(isA<RedeExcecao>()),
    );
  });

  test('lança RespostaInvalidaExcecao se corpo não interpretável', () async {
    final gemini = GeminiDataSource(
      cliente: MockClient((_) async => http.Response('não é json', 200)),
    );

    expect(
      () => gemini.gerar(tema: 't', categoria: 'c', chave: 'k'),
      throwsA(isA<RespostaInvalidaExcecao>()),
    );
  });
}
