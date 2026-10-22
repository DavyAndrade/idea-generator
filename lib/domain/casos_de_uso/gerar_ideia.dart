import '../../core/resultado.dart';
import '../entidades/ideia.dart';
import '../repositorios/ideia_repository.dart';

class GerarIdeia {
  GerarIdeia(this._repositorio);
  final IdeiaRepository _repositorio;

  Future<Resultado<Ideia>> executar({
    required String tema,
    required String categoria,
  }) {
    return _repositorio.gerar(tema: tema, categoria: categoria);
  }
}
