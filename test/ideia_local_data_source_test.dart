import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as p;
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import 'package:gerador_de_ideias/data/fontes/ideia_local_data_source.dart';
import 'package:gerador_de_ideias/data/modelos/ideia_model.dart';

void main() {
  late IdeiaLocalDataSource dataSource;
  late Directory tempDir;
  var contador = 0;

  setUpAll(sqfliteFfiInit);

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('ideia_test_');
    dataSource = IdeiaLocalDataSource(
      databaseFactoryOverride: databaseFactoryFfi,
      caminhoBanco: p.join(tempDir.path, 'db_${contador++}.db'),
    );
    await dataSource.listar();
  });

  tearDown(() async {
    await dataSource.fechar();
    await tempDir.delete(recursive: true);
  });

  IdeiaModel ideiaNova({String titulo = 'Ideia 1'}) {
    return IdeiaModel(
      titulo: titulo,
      descricao: 'Descrição',
      tema: 'plantas',
      categoria: 'App',
      criadoEm: DateTime.now(),
    );
  }

  test('inserir gera id e listar retorna em ordem decrescente', () async {
    final a = await dataSource.inserir(ideiaNova(titulo: 'Primeira'));
    final b = await dataSource.inserir(ideiaNova(titulo: 'Segunda'));
    expect(a.id, isNotNull);
    expect(b.id, isNotNull);

    final lista = await dataSource.listar();
    expect(lista.length, 2);
    expect(lista.first.titulo, 'Segunda');
  });

  test('listar filtra favoritas', () async {
    final a = await dataSource.inserir(ideiaNova());
    await dataSource.inserir(ideiaNova(titulo: 'Outra'));
    await dataSource.atualizar(a.copiarCom(favorito: true));

    final favoritas = await dataSource.listar(somenteFavoritas: true);
    expect(favoritas.length, 1);
    expect(favoritas.first.favorito, isTrue);
  });

  test('excluir remove pelo id', () async {
    final a = await dataSource.inserir(ideiaNova());
    await dataSource.excluir(a.id!);

    final lista = await dataSource.listar();
    expect(lista, isEmpty);
  });

  test('roundtrip preserva campos', () async {
    final original = ideiaNova().copiarCom(promptUsado: '{"x":1}');
    final salva = await dataSource.inserir(original);
    final lida = (await dataSource.listar()).first;

    expect(lida.titulo, original.titulo);
    expect(lida.tema, original.tema);
    expect(lida.categoria, original.categoria);
    expect(lida.promptUsado, original.promptUsado);
    expect(lida.favorito, original.favorito);
    expect(lida.id, salva.id);
  });
}
