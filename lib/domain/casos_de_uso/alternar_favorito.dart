import '../../core/resultado.dart';
import '../entidades/ideia.dart';
import '../repositorios/ideia_repository.dart';

class AlternarFavorito {
  AlternarFavorito(this._repositorio);
  final IdeiaRepository _repositorio;

  Future<Resultado<Ideia>> executar(Ideia ideia) {
    return _repositorio.alternarFavorito(ideia);
  }
}
