import '../../core/resultado.dart';
import '../entidades/ideia.dart';
import '../repositorios/ideia_repository.dart';

class ListarIdeias {
  ListarIdeias(this._repositorio);
  final IdeiaRepository _repositorio;

  Future<Resultado<List<Ideia>>> executar({bool somenteFavoritas = false}) {
    return _repositorio.listar(somenteFavoritas: somenteFavoritas);
  }
}
