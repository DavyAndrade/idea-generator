import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  lerChave,
  salvarChave,
  lerModelo,
  salvarModelo,
  atualizarNomeUsuario,
} from "@/lib/storage";
import { obterSessaoAtual } from "@/lib/storage";
import { testarConexaoGemini } from "@/lib/gemini";
import { MODELO_PADRAO, MODELOS_DISPONIVEIS } from "@/types";
import type { ModeloGemini } from "@/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";

interface TelaConfiguracaoProps {
  onSalvo?: () => void;
  onPerfilAtualizado?: () => void;
}

export function TelaConfiguracao({ onSalvo, onPerfilAtualizado }: TelaConfiguracaoProps) {
  const [chave, setChave] = useState("");
  const [mostrarChave, setMostrarChave] = useState(false);
  const [modelo, setModelo] = useState<ModeloGemini>(MODELO_PADRAO);
  const [salvando, setSalvando] = useState(false);
  const [testandoGemini, setTestandoGemini] = useState(false);
  const [status, setStatus] = useState<
    { tipo: "ok" | "erro"; msg: string } | undefined
  >();

  // Perfil do usuário
  const sessao = obterSessaoAtual();
  const [nomePerfil, setNomePerfil] = useState(sessao?.nome ?? "");
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [statusPerfil, setStatusPerfil] = useState<
    { tipo: "ok" | "erro"; msg: string } | undefined
  >();

  useEffect(() => {
    Promise.all([
      lerChave().catch(() => ""),
      lerModelo().catch(() => MODELO_PADRAO),
    ]).then(([c, m]) => {
      setChave(c || "");
      setModelo(m || MODELO_PADRAO);
    });

    const s = obterSessaoAtual();
    if (s) setNomePerfil(s.nome);
  }, []);

  const salvar = async () => {
    setSalvando(true);
    setStatus(undefined);
    try {
      await salvarChave(chave.trim());
      await salvarModelo(modelo);
      setStatus({ tipo: "ok", msg: "Chave salva." });
      onSalvo?.();
    } catch (e: unknown) {
      setStatus({
        tipo: "erro",
        msg: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSalvando(false);
    }
  };

  const testarGemini = async () => {
    if (!chave.trim()) {
      setStatus({ tipo: "erro", msg: "Configure a chave antes de testar." });
      return;
    }
    setTestandoGemini(true);
    setStatus(undefined);
    try {
      const r = await testarConexaoGemini(chave.trim(), modelo);
      setStatus({ tipo: r.ok ? "ok" : "erro", msg: r.mensagem });
    } catch (e: unknown) {
      setStatus({
        tipo: "erro",
        msg: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setTestandoGemini(false);
    }
  };

  const salvarPerfil = async () => {
    if (!nomePerfil.trim()) {
      setStatusPerfil({ tipo: "erro", msg: "Digite um nome válido." });
      return;
    }
    setSalvandoPerfil(true);
    setStatusPerfil(undefined);
    try {
      await atualizarNomeUsuario(nomePerfil.trim());
      setStatusPerfil({ tipo: "ok", msg: "Nome atualizado." });
      onPerfilAtualizado?.();
    } catch (e: unknown) {
      setStatusPerfil({
        tipo: "erro",
        msg: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSalvandoPerfil(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {/* Perfil do Usuário */}
      {sessao && (
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold mb-3">Perfil do Usuário</h3>
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome</label>
            <Input
              type="text"
              placeholder="Seu nome"
              value={nomePerfil}
              onChange={(e) => setNomePerfil(e.target.value)}
              disabled={salvandoPerfil}
            />
            <Button
              className="w-full"
              disabled={salvandoPerfil || !nomePerfil.trim()}
              onClick={salvarPerfil}
            >
              {salvandoPerfil ? "Salvando..." : "Salvar perfil"}
            </Button>
          </div>
          {statusPerfil && (
            <p
              className={
                "mt-2 text-sm" +
                (statusPerfil.tipo === "erro"
                  ? " text-destructive"
                  : " text-green-600")
              }
            >
              {statusPerfil.msg}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Chave de API do Gemini</label>
        <div className="relative">
          <Input
            type={mostrarChave ? "text" : "password"}
            value={chave}
            onChange={(e) => setChave(e.target.value)}
            placeholder="AIza..."
          />
          <button
            type="button"
            tabIndex={-1}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            onClick={() => setMostrarChave(!mostrarChave)}
            aria-label={mostrarChave ? "Ocultar" : "Mostrar"}
          >
            {mostrarChave ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <Button
          className="w-full"
          disabled={salvando || !chave.trim()}
          onClick={salvar}
        >
          {salvando ? "Salvando..." : "Salvar chave"}
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          disabled={testandoGemini}
          onClick={testarGemini}
        >
          {testandoGemini ? "Testando..." : "Testar Gemini"}
        </Button>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Modelo</label>
        <div className="flex flex-wrap gap-2">
          {MODELOS_DISPONIVEIS.map((m) => (
            <Badge
              key={m}
              variant={modelo === m ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => {
                setModelo(m);
                salvarModelo(m)
                  .then(() => onSalvo?.())
                  .catch(() => {});
              }}
            >
              {m}
            </Badge>
          ))}
        </div>
      </div>

      {status && (
        <p
          className={
            "text-sm" +
            (status.tipo === "erro" ? " text-destructive" : " text-green-600")
          }
        >
          {status.msg}
        </p>
      )}
    </div>
  );
}
