import 'package:flutter/material.dart';

import '../../core/chave_api_store.dart';
import '../../core/constantes.dart';

class TelaConfiguracao extends StatefulWidget {
  const TelaConfiguracao({super.key, required this.chaveStore});

  final ChaveApiStore chaveStore;

  @override
  State<TelaConfiguracao> createState() => _TelaConfiguracaoState();
}

class _TelaConfiguracaoState extends State<TelaConfiguracao> {
  final _controlador = TextEditingController();
  bool _obscuro = true;
  bool _salvando = false;
  String _modelo = Constantes.modeloPadrao;

  @override
  void initState() {
    super.initState();
    widget.chaveStore.ler().then((chave) {
      if (chave != null && mounted) _controlador.text = chave;
    });
    widget.chaveStore.lerModelo().then((modelo) {
      if (mounted) setState(() => _modelo = modelo);
    });
  }

  @override
  void dispose() {
    _controlador.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        TextField(
          controller: _controlador,
          obscureText: _obscuro,
          decoration: InputDecoration(
            labelText: 'Chave de API do Gemini',
            border: const OutlineInputBorder(),
            suffixIcon: IconButton(
              icon: Icon(_obscuro ? Icons.visibility : Icons.visibility_off),
              onPressed: () => setState(() => _obscuro = !_obscuro),
            ),
          ),
        ),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: _salvando ? null : _salvar,
          child: Text(_salvando ? 'Salvando...' : 'Salvar chave'),
        ),
        const SizedBox(height: 24),
        const Text('Modelo:'),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: [
            for (final modelo in Constantes.modelosDisponiveis)
              ChoiceChip(
                label: Text(modelo),
                selected: _modelo == modelo,
                onSelected: (_) => _salvarModelo(modelo),
              ),
          ],
        ),
        const SizedBox(height: 24),
        const Text(
          'A chave fica salva apenas no Keystore do seu aparelho. '
          'Gere a sua em aistudio.google.com/apikey',
          style: TextStyle(color: Colors.grey),
        ),
      ],
    );
  }

  Future<void> _salvarModelo(String modelo) async {
    setState(() => _modelo = modelo);
    await widget.chaveStore.salvarModelo(modelo);
  }

  Future<void> _salvar() async {
    setState(() => _salvando = true);
    await widget.chaveStore.salvar(_controlador.text.trim());
    if (mounted) {
      setState(() => _salvando = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Chave salva.')));
    }
  }
}
