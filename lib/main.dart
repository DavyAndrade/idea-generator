import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/chave_api_store.dart';
import 'data/fontes/gemini_data_source.dart';
import 'data/fontes/ideia_local_data_source.dart';
import 'data/repositorios/ideia_repository_impl.dart';
import 'domain/casos_de_uso/alternar_favorito.dart';
import 'domain/casos_de_uso/excluir_ideia.dart';
import 'domain/casos_de_uso/gerar_ideia.dart';
import 'domain/casos_de_uso/listar_ideias.dart';
import 'domain/casos_de_uso/salvar_ideia.dart';
import 'presentation/provedores/ideia_provedor.dart';
import 'presentation/telas/tela_configuracao.dart';
import 'presentation/telas/tela_gerar.dart';
import 'presentation/telas/tela_historico.dart';

void main() {
  final chaveStore = ChaveApiStore();
  final gemini = GeminiDataSource();
  final local = IdeiaLocalDataSource();
  final repositorio = IdeiaRepositoryImpl(
    local: local,
    gemini: gemini,
    chaveStore: chaveStore,
  );

  runApp(
    MultiProvider(
      providers: [
        Provider.value(value: chaveStore),
        ChangeNotifierProvider(
          create: (_) => IdeiaProvider(
            gerarIdeia: GerarIdeia(repositorio),
            salvarIdeia: SalvarIdeia(repositorio),
            listarIdeias: ListarIdeias(repositorio),
            excluirIdeia: ExcluirIdeia(repositorio),
            alternarFavoritoCaso: AlternarFavorito(repositorio),
          )..carregar(),
        ),
      ],
      child: const App(),
    ),
  );
}

class App extends StatelessWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Gerador de Ideias',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const TelaPrincipal(),
    );
  }
}

class TelaPrincipal extends StatefulWidget {
  const TelaPrincipal({super.key});

  @override
  State<TelaPrincipal> createState() => _TelaPrincipalState();
}

class _TelaPrincipalState extends State<TelaPrincipal> {
  int _aba = 0;

  @override
  Widget build(BuildContext context) {
    final chaveStore = context.read<ChaveApiStore>();
    return Scaffold(
      appBar: AppBar(title: const Text('Gerador de Ideias')),
      body: Column(
        children: [
          if (_aba == 0)
            _BannerSemChave(
              chaveStore: chaveStore,
              onAbrirConfig: () => setState(() => _aba = 2),
            ),
          Expanded(
            child: IndexedStack(
              index: _aba,
              children: [
                const TelaGerar(),
                const TelaHistorico(),
                TelaConfiguracao(chaveStore: chaveStore),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _aba,
        onDestinationSelected: (i) {
          setState(() => _aba = i);
          if (i == 1) context.read<IdeiaProvider>().carregar();
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.auto_awesome), label: 'Gerar'),
          NavigationDestination(icon: Icon(Icons.history), label: 'Histórico'),
          NavigationDestination(icon: Icon(Icons.settings), label: 'Config'),
        ],
      ),
    );
  }
}

class _BannerSemChave extends StatelessWidget {
  const _BannerSemChave({
    required this.chaveStore,
    required this.onAbrirConfig,
  });

  final ChaveApiStore chaveStore;
  final VoidCallback onAbrirConfig;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<String?>(
      future: chaveStore.ler(),
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const SizedBox.shrink();
        }
        if (snapshot.data != null && snapshot.data!.isNotEmpty) {
          return const SizedBox.shrink();
        }
        return Material(
          color: Theme.of(context).colorScheme.errorContainer,
          child: ListTile(
            leading: const Icon(Icons.key_off),
            title: const Text('Configure sua chave de API do Gemini'),
            trailing: const Icon(Icons.chevron_right),
            onTap: onAbrirConfig,
          ),
        );
      },
    );
  }
}
