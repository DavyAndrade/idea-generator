import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'constantes.dart';

/// Guarda a chave API do Gemini e o modelo no Keystore (Android).
class ChaveApiStore {
  ChaveApiStore({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  static const _chave = 'gemini_api_key';
  static const _modelo = 'gemini_modelo';

  final FlutterSecureStorage _storage;

  Future<String?> ler() => _storage.read(key: _chave);

  Future<void> salvar(String chave) =>
      _storage.write(key: _chave, value: chave);

  Future<String> lerModelo() async =>
      await _storage.read(key: _modelo) ?? Constantes.modeloPadrao;

  Future<void> salvarModelo(String modelo) =>
      _storage.write(key: _modelo, value: modelo);

  Future<void> limpar() => _storage.delete(key: _chave);
}
