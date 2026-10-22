/// Entidade pura de uma ideia gerada.
class Ideia {
  const Ideia({
    this.id,
    required this.titulo,
    required this.descricao,
    required this.tema,
    required this.categoria,
    this.promptUsado,
    this.favorito = false,
    this.criadoEm,
  });

  final int? id;
  final String titulo;
  final String descricao;
  final String tema;
  final String categoria;
  final String? promptUsado;
  final bool favorito;
  final DateTime? criadoEm;

  Ideia copiarCom({
    int? id,
    String? titulo,
    String? descricao,
    String? tema,
    String? categoria,
    String? promptUsado,
    bool? favorito,
    DateTime? criadoEm,
  }) {
    return Ideia(
      id: id ?? this.id,
      titulo: titulo ?? this.titulo,
      descricao: descricao ?? this.descricao,
      tema: tema ?? this.tema,
      categoria: categoria ?? this.categoria,
      promptUsado: promptUsado ?? this.promptUsado,
      favorito: favorito ?? this.favorito,
      criadoEm: criadoEm ?? this.criadoEm,
    );
  }
}
