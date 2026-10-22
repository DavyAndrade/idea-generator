import '../../core/chave_api_store.dart';
import '../../core/excecoes.dart';
import '../../core/resultado.dart';
import '../../domain/entidades/ideia.dart';
import '../../domain/repositorios/ideia_repository.dart';
import '../fontes/gemini_data_source.dart';
import '../fontes/ideia_local_data_source.dart';
import '../modelos/ideia_model.dart';

class IdeiaRepositoryImpl implements IdeiaRepository {
  IdeiaRepositoryImpl({
    required this.local,
    required this.gemini,
    required this.chaveStore,
  });

  final IdeiaLocalDataSource local;
  final GeminiDataSource gemini;
  final ChaveApiStore chaveStore;

  @override
  Future<Resultado<Ideia>> gerar({
    required String tema,
    required String categoria,
  }) async {
    try {
      final chave = await chaveStore.ler();
      if (chave == null || chave.isEmpty) {
        return Falha(
          ChaveApiExcecao('Configure sua chave de API nas configurações.'),
        );
      }
      final modelo = await chaveStore.lerModelo();
      final ideia = await gemini.gerar(
        tema: tema,
        categoria: categoria,
        chave: chave,
        modelo: modelo,
      );
      return Sucesso(ideia);
    } on AppExcecao catch (e) {
      return Falha(e);
    }
  }

  @override
  Future<Resultado<Ideia>> salvar(Ideia ideia) async {
    try {
      final salva = await local.inserir(
        IdeiaModel(
          titulo: ideia.titulo,
          descricao: ideia.descricao,
          tema: ideia.tema,
          categoria: ideia.categoria,
          promptUsado: ideia.promptUsado,
          favorito: ideia.favorito,
          criadoEm: ideia.criadoEm,
        ),
      );
      return Sucesso(salva);
    } on AppExcecao catch (e) {
      return Falha(e);
    }
  }

  @override
  Future<Resultado<List<Ideia>>> listar({bool somenteFavoritas = false}) async {
    try {
      return Sucesso(await local.listar(somenteFavoritas: somenteFavoritas));
    } on AppExcecao catch (e) {
      return Falha(e);
    }
  }

  @override
  Future<Resultado<void>> excluir(int id) async {
    try {
      await local.excluir(id);
      return const Sucesso(null);
    } on AppExcecao catch (e) {
      return Falha(e);
    }
  }

  @override
  Future<Resultado<Ideia>> alternarFavorito(Ideia ideia) async {
    try {
      final atualizada = await local.atualizar(
        IdeiaModel(
          id: ideia.id,
          titulo: ideia.titulo,
          descricao: ideia.descricao,
          tema: ideia.tema,
          categoria: ideia.categoria,
          promptUsado: ideia.promptUsado,
          favorito: !ideia.favorito,
          criadoEm: ideia.criadoEm,
        ),
      );
      return Sucesso(atualizada);
    } on AppExcecao catch (e) {
      return Falha(e);
    }
  }
}
