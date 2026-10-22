import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../core/constantes.dart';
import '../../domain/entidades/ideia.dart';
import '../provedores/ideia_provedor.dart';

class TelaGerar extends StatefulWidget {
  const TelaGerar({super.key});

  @override
  State<TelaGerar> createState() => _TelaGerarState();
}

class _TelaGerarState extends State<TelaGerar> {
  final _controladorTema = TextEditingController();
  String _categoria = Constantes.categorias.first;

  @override
  void dispose() {
    _controladorTema.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<IdeiaProvider>();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        TextField(
          controller: _controladorTema,
          decoration: const InputDecoration(
            labelText: 'Tema da ideia',
            hintText: 'ex.: aplicativo para plantas caseiras',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          children: [
            for (final categoria in Constantes.categorias)
              ChoiceChip(
                label: Text(categoria),
                selected: _categoria == categoria,
                onSelected: (_) => setState(() => _categoria = categoria),
              ),
          ],
        ),
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: provider.carregando
              ? null
              : () => provider.gerar(
                  tema: _controladorTema.text.trim(),
                  categoria: _categoria,
                ),
          icon: provider.carregando
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.auto_awesome),
          label: Text(provider.carregando ? 'Gerando...' : 'Gerar ideia'),
        ),
        const SizedBox(height: 24),
        if (provider.erro != null)
          Card(
            color: Theme.of(context).colorScheme.errorContainer,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Text('${provider.erro}'),
            ),
          ),
        if (provider.ultimaIdeia != null)
          _CartaoResultado(
            ideia: provider.ultimaIdeia!,
            onSalvar: provider.salvarUltima,
            onCopiar: () => _copiar(context, provider.ultimaIdeia!),
          ),
      ],
    );
  }

  Future<void> _copiar(BuildContext context, Ideia ideia) async {
    await Clipboard.setData(
      ClipboardData(text: '${ideia.titulo}\n\n${ideia.descricao}'),
    );
    if (context.mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Copiado!')));
    }
  }
}

class _CartaoResultado extends StatelessWidget {
  const _CartaoResultado({
    required this.ideia,
    required this.onSalvar,
    required this.onCopiar,
  });

  final Ideia ideia;
  final VoidCallback onSalvar;
  final VoidCallback onCopiar;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(ideia.titulo, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(ideia.descricao),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                IconButton(
                  onPressed: onCopiar,
                  icon: const Icon(Icons.copy),
                  tooltip: 'Copiar',
                ),
                const SizedBox(width: 8),
                FilledButton.tonalIcon(
                  onPressed: onSalvar,
                  icon: const Icon(Icons.bookmark_add),
                  label: const Text('Salvar'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
