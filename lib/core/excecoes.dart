/// Erro base do domínio.
class AppExcecao implements Exception {
  AppExcecao(this.mensagem, {this.causa});
  final String mensagem;
  final Object? causa;

  @override
  String toString() => mensagem;
}

/// Falha de rede/HTTP.
class RedeExcecao extends AppExcecao {
  RedeExcecao(super.mensagem, {super.causa, this.statusCode});
  final int? statusCode;
}

/// Chave API ausente, inválida ou rejeitada (401/403).
class ChaveApiExcecao extends AppExcecao {
  ChaveApiExcecao(super.mensagem, {super.causa});
}

/// Resposta do Gemini veio em formato não interpretável.
class RespostaInvalidaExcecao extends AppExcecao {
  RespostaInvalidaExcecao(super.mensagem, {super.causa});
}

/// Falha de banco de dados local.
class BancoExcecao extends AppExcecao {
  BancoExcecao(super.mensagem, {super.causa});
}
