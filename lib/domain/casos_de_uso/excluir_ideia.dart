import '../../core/resultado.dart';
import '../repositorios/ideia_repository.dart';

class ExcluirIdeia {
  ExcluirIdeia(this._repositorio);
  final IdeiaRepository _repositorio;

  Future<Resultado<void>> executar(int id) {
    return _repositorio.excluir(id);
  }
}
