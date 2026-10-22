import '../../domain/entidades/ideia.dart';

/// Mapeamento Ideia <-> Map do SQLite.
class IdeiaModel extends Ideia {
  const IdeiaModel({
    super.id,
    required super.titulo,
    required super.descricao,
    required super.tema,
    required super.categoria,
    super.promptUsado,
    super.favorito,
    super.criadoEm,
  });

  factory IdeiaModel.deMapa(Map<String, Object?> mapa) {
    return IdeiaModel(
      id: mapa['id'] as int?,
      titulo: mapa['titulo'] as String,
      descricao: mapa['descricao'] as String,
      tema: mapa['tema'] as String,
      categoria: mapa['categoria'] as String,
      promptUsado: mapa['prompt_usado'] as String?,
      favorito: (mapa['favorito'] as int? ?? 0) == 1,
      criadoEm: DateTime.tryParse(mapa['criado_em'] as String? ?? ''),
    );
  }

  Map<String, Object?> paraMapa() {
    return {
      'id': id,
      'titulo': titulo,
      'descricao': descricao,
      'tema': tema,
      'categoria': categoria,
      'prompt_usado': promptUsado,
      'favorito': favorito ? 1 : 0,
      'criado_em': (criadoEm ?? DateTime.now()).toIso8601String(),
    };
  }

  @override
  IdeiaModel copiarCom({
    int? id,
    String? titulo,
    String? descricao,
    String? tema,
    String? categoria,
    String? promptUsado,
    bool? favorito,
    DateTime? criadoEm,
  }) {
    return IdeiaModel(
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
