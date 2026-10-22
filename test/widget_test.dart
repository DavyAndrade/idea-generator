import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:flutter/material.dart';

import 'package:gerador_de_ideias/core/resultado.dart';
import 'package:gerador_de_ideias/domain/casos_de_uso/alternar_favorito.dart';
import 'package:gerador_de_ideias/domain/casos_de_uso/excluir_ideia.dart';
import 'package:gerador_de_ideias/domain/casos_de_uso/gerar_ideia.dart';
import 'package:gerador_de_ideias/domain/casos_de_uso/listar_ideias.dart';
import 'package:gerador_de_ideias/domain/casos_de_uso/salvar_ideia.dart';
import 'package:gerador_de_ideias/domain/entidades/ideia.dart';
import 'package:gerador_de_ideias/domain/repositorios/ideia_repository.dart';
import 'package:gerador_de_ideias/presentation/provedores/ideia_provedor.dart';
import 'package:gerador_de_ideias/presentation/telas/tela_gerar.dart';

class _RepoFake implements IdeiaRepository {
  @override
  Future<Resultado<Ideia>> gerar({
    required String tema,
    required String categoria,
  }) async {
    return Sucesso(
      Ideia(
        titulo: 'Ideia fake',
        descricao: 'Descrição fake',
        tema: tema,
        categoria: categoria,
      ),
    );
  }

  @override
  Future<Resultado<Ideia>> salvar(Ideia ideia) async => Sucesso(ideia);

  @override
  Future<Resultado<List<Ideia>>> listar({bool somenteFavoritas = false}) async {
    return const Sucesso([]);
  }

  @override
  Future<Resultado<void>> excluir(int id) async => const Sucesso(null);

  @override
  Future<Resultado<Ideia>> alternarFavorito(Ideia ideia) async =>
      Sucesso(ideia);
}

void main() {
  late IdeiaProvider provider;

  setUp(() {
    final repo = _RepoFake();
    provider = IdeiaProvider(
      gerarIdeia: GerarIdeia(repo),
      salvarIdeia: SalvarIdeia(repo),
      listarIdeias: ListarIdeias(repo),
      excluirIdeia: ExcluirIdeia(repo),
      alternarFavoritoCaso: AlternarFavorito(repo),
    );
  });

  Widget montarApp() {
    return ChangeNotifierProvider.value(
      value: provider,
      child: const MaterialApp(home: Scaffold(body: TelaGerar())),
    );
  }

  testWidgets('exibe campo de tema e chips de categoria', (tester) async {
    await tester.pumpWidget(montarApp());

    expect(find.byType(TextField), findsOneWidget);
    expect(find.text('App'), findsOneWidget);
    expect(find.text('Open Source'), findsOneWidget);
    expect(find.text('Gerar ideia'), findsOneWidget);
  });

  testWidgets('gera ideia ao tocar no botão', (tester) async {
    await tester.pumpWidget(montarApp());

    await tester.enterText(find.byType(TextField), 'plantas');
    await tester.tap(find.text('Gerar ideia'));
    await tester.pumpAndSettle();

    expect(find.text('Ideia fake'), findsOneWidget);
  });
}
