import { useEffect, useState } from "react";
import { Sparkles, History, Settings } from "lucide-react";

import { AppBar } from "./components/app-bar";
import { BannerSemChave } from "./components/banner-sem-chave";
import { TelaGerar } from "./components/tela-gerar";
import { TelaHistorico } from "./components/tela-historico";
import { TelaConfiguracao } from "./components/tela-configuracao";
import { lerChave, lerModelo } from "./lib/storage";
import { MODELO_PADRAO } from "./types";
import type { ModeloGemini } from "./types";

const ABAS = [
  { id: 0, label: "Gerar", icon: Sparkles },
  { id: 1, label: "Histórico", icon: History },
  { id: 2, label: "Config", icon: Settings },
] as const;

export function App() {
  const [aba, setAba] = useState(0);
  const [dark, setDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const [chave, setChave] = useState("");
  const [modelo, setModelo] = useState<ModeloGemini>(MODELO_PADRAO);
  const [recarregarHistorico, setRecarregarHistorico] = useState(0);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const sincronizarConfig = () => {
    lerChave()
      .then((c) => setChave(c ?? ""))
      .catch(() => setChave(""));
    lerModelo()
      .then((m) => setModelo(m ?? MODELO_PADRAO))
      .catch(() => setModelo(MODELO_PADRAO));
  };

  useEffect(() => {
    sincronizarConfig();
  }, []);

  const irConfig = () => setAba(2);

  const recarregarHistoricoHandler = () =>
    setRecarregarHistorico((n) => n + 1);

  return (
    <div className="min-h-dvh bg-muted/30">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col border-x bg-background shadow-sm">
        <AppBar dark={dark} onToggleDark={() => setDark(!dark)} />

        {aba === 0 && chave === "" && <BannerSemChave onClick={irConfig} />}

        <main className="flex flex-1 flex-col">
          {aba === 0 && <TelaGerar chave={chave} modelo={modelo} />}
          {aba === 1 && (
            <TelaHistorico recarregarTrigger={recarregarHistorico} />
          )}
          {aba === 2 && (
            <TelaConfiguracao onSalvo={sincronizarConfig} />
          )}
        </main>

        <nav className="sticky bottom-0 border-t bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <ul className="flex h-16 items-center justify-around">
            {ABAS.map(({ id, label, icon: Icone }) => (
              <li key={id}>
                <button
                  onClick={() => {
                    setAba(id);
                    if (id === 1) recarregarHistoricoHandler();
                  }}
                  className={
                    "flex flex-col items-center gap-1 rounded-md px-3 py-2 text-xs transition-colors " +
                    (aba === id
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  <Icone size={20} />
                  <span>{label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}

export default App;
