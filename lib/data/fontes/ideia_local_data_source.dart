import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

import '../../core/excecoes.dart';
import '../modelos/ideia_model.dart';

/// CRUD local das ideias via sqflite.
///
/// Produção: [IdeiaLocalDataSource] com defaults (banco real).
/// Teste: passe [databaseFactoryOverride] (ffi) + [caminhoBanco] (temp) para isolar.
class IdeiaLocalDataSource {
  IdeiaLocalDataSource({this.databaseFactoryOverride, this.caminhoBanco});

  final DatabaseFactory? databaseFactoryOverride;
  final String? caminhoBanco;

  Database? _banco;

  static const _nomeBanco = 'gerador_de_ideias.db';
  static const versaoBanco = 1;

  static const _sqlCriacao = '''
    CREATE TABLE ideias(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      tema TEXT NOT NULL,
      categoria TEXT NOT NULL,
      prompt_usado TEXT,
      favorito INTEGER NOT NULL DEFAULT 0,
      criado_em TEXT NOT NULL
    )
  ''';

  Future<Database> _abrir() async {
    final banco = _banco;
    if (banco != null) return banco;

    final factory = databaseFactoryOverride ?? databaseFactory;
    final caminho =
        caminhoBanco ?? p.join(await getDatabasesPath(), _nomeBanco);

    _banco = await factory.openDatabase(
      caminho,
      options: OpenDatabaseOptions(
        version: versaoBanco,
        onCreate: (db, _) => db.execute(_sqlCriacao),
      ),
    );
    return _banco!;
  }

  Future<IdeiaModel> inserir(IdeiaModel ideia) async {
    try {
      final db = await _abrir();
      final id = await db.insert('ideias', ideia.paraMapa()..remove('id'));
      return ideia.copiarCom(id: id);
    } on Exception catch (e) {
      throw BancoExcecao('Falha ao salvar ideia.', causa: e);
    }
  }

  Future<List<IdeiaModel>> listar({bool somenteFavoritas = false}) async {
    try {
      final db = await _abrir();
      final linhas = await db.query(
        'ideias',
        where: somenteFavoritas ? 'favorito = 1' : null,
        orderBy: 'criado_em DESC',
      );
      return linhas.map(IdeiaModel.deMapa).toList();
    } on Exception catch (e) {
      throw BancoExcecao('Falha ao listar ideias.', causa: e);
    }
  }

  Future<void> excluir(int id) async {
    try {
      final db = await _abrir();
      await db.delete('ideias', where: 'id = ?', whereArgs: [id]);
    } on Exception catch (e) {
      throw BancoExcecao('Falha ao excluir ideia.', causa: e);
    }
  }

  Future<IdeiaModel> atualizar(IdeiaModel ideia) async {
    try {
      final db = await _abrir();
      await db.update(
        'ideias',
        ideia.paraMapa(),
        where: 'id = ?',
        whereArgs: [ideia.id],
      );
      return ideia;
    } on Exception catch (e) {
      throw BancoExcecao('Falha ao atualizar ideia.', causa: e);
    }
  }

  Future<void> fechar() async {
    await _banco?.close();
    _banco = null;
  }
}
