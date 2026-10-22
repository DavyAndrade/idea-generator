import '../../core/resultado.dart';
import '../entidades/ideia.dart';

/// Contrato de persistência e geração de ideias.
///
/// Implementação em data/. O domain só conhece esta interface.
abstract interface class IdeiaRepository {
  Future<Resultado<Ideia>> gerar({
    required String tema,
    required String categoria,
  });

  Future<Resultado<Ideia>> salvar(Ideia ideia);

  Future<Resultado<List<Ideia>>> listar({bool somenteFavoritas = false});

  Future<Resultado<void>> excluir(int id);

  Future<Resultado<Ideia>> alternarFavorito(Ideia ideia);
}
