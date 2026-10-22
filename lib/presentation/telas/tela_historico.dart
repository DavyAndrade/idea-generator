import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../provedores/ideia_provedor.dart';

class TelaHistorico extends StatelessWidget {
  const TelaHistorico({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<IdeiaProvider>();

    if (provider.ideias.isEmpty) {
      return const Center(child: Text('Nenhuma ideia salva ainda.'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(8),
      itemCount: provider.ideias.length,
      itemBuilder: (context, i) {
        final ideia = provider.ideias[i];
        return Card(
          margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
          child: ListTile(
            title: Text(ideia.titulo),
            subtitle: Text(
              ideia.descricao,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: Icon(
                    ideia.favorito ? Icons.star : Icons.star_border,
                    color: ideia.favorito ? Colors.amber : null,
                  ),
                  onPressed: () => provider.alternarFavorito(ideia),
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline),
                  onPressed: () => provider.excluir(ideia.id!),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
