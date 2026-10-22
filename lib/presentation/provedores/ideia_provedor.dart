import 'package:flutter/foundation.dart';

import '../../domain/casos_de_uso/alternar_favorito.dart';
import '../../domain/casos_de_uso/excluir_ideia.dart';
import '../../domain/casos_de_uso/gerar_ideia.dart';
import '../../domain/casos_de_uso/listar_ideias.dart';
import '../../domain/casos_de_uso/salvar_ideia.dart';
import '../../domain/entidades/ideia.dart';

/// Orquestra os casos de uso para as telas.
class IdeiaProvider extends ChangeNotifier {
  IdeiaProvider({
    required this.gerarIdeia,
    required this.salvarIdeia,
    required this.listarIdeias,
    required this.excluirIdeia,
    required this.alternarFavoritoCaso,
  });

  final GerarIdeia gerarIdeia;
  final SalvarIdeia salvarIdeia;
  final ListarIdeias listarIdeias;
  final ExcluirIdeia excluirIdeia;
  final AlternarFavorito alternarFavoritoCaso;

  List<Ideia> ideias = [];
  Ideia? ultimaIdeia;
  bool carregando = false;
  bool somenteFavoritas = false;
  Object? erro;

  Future<void> carregar() async {
    final resultado = await listarIdeias.executar(
      somenteFavoritas: somenteFavoritas,
    );
    resultado.when(sucesso: (lista) => ideias = lista, falha: (e) => erro = e);
    notifyListeners();
  }

  Future<void> gerar({required String tema, required String categoria}) async {
    carregando = true;
    erro = null;
    notifyListeners();

    final resultado = await gerarIdeia.executar(
      tema: tema,
      categoria: categoria,
    );
    resultado.when(
      sucesso: (ideia) => ultimaIdeia = ideia,
      falha: (e) => erro = e,
    );
    carregando = false;
    notifyListeners();
  }

  Future<void> salvarUltima() async {
    final ideia = ultimaIdeia;
    if (ideia == null) return;
    final resultado = await salvarIdeia.executar(ideia);
    resultado.when(sucesso: (_) {}, falha: (e) => erro = e);
    ultimaIdeia = null;
    await carregar();
  }

  Future<void> excluir(int id) async {
    final resultado = await excluirIdeia.executar(id);
    resultado.when(sucesso: (_) {}, falha: (e) => erro = e);
    await carregar();
  }

  Future<void> alternarFavorito(Ideia ideia) async {
    final resultado = await alternarFavoritoCaso.executar(ideia);
    resultado.when(sucesso: (_) {}, falha: (e) => erro = e);
    await carregar();
  }

  Future<void> filtrarFavoritas(bool valor) async {
    somenteFavoritas = valor;
    await carregar();
  }
}
