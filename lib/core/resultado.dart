/// Resultado genérico de operação: sucesso ou falha tipada.
sealed class Resultado<T> {
  const Resultado();

  R when<R>({
    required R Function(T valor) sucesso,
    required R Function(Object erro) falha,
  }) {
    return switch (this) {
      Sucesso<T>(:final valor) => sucesso(valor),
      Falha<T>(:final erro) => falha(erro),
    };
  }
}

class Sucesso<T> extends Resultado<T> {
  const Sucesso(this.valor);
  final T valor;
}

class Falha<T> extends Resultado<T> {
  const Falha(this.erro);
  final Object erro;
}
