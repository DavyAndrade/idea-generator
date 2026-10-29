import { useState } from "react";
import { CATEGORIAS, type ModeloGemini } from "../types";
import { gerarIdeiaGemini } from "../lib/gemini";
import { salvarIdeia } from "../lib/storage";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { AcaoToast } from "./acao-toast";
import { ResultadoGerar } from "./ideia-card";

interface TelaGerarProps {
  chave: string;
  modelo: ModeloGemini;
}

export function TelaGerar({ chave, modelo }: TelaGerarProps) {
  const [tema, setTema] = useState("");
  const [categoria, setCategoria] = useState<string>(CATEGORIAS[0]);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<null | {
    titulo: string;
    descricao: string;
    categoria: string;
    promptUsado?: string;
  }>(null);
  const [toast, setToast] = useState<{
    show: boolean;
    msg: string;
    icon: "copy" | "save" | "check";
  }>({ show: false, msg: "", icon: "check" });

  const gerar = async () => {
    if (!tema.trim()) return;
    setGerando(true);
    setErro(null);
    setResultado(null);
    try {
      const ideia = await gerarIdeiaGemini({
        tema: tema.trim(),
        categoria,
        chave,
        modelo,
      });
      setResultado({
        titulo: ideia.titulo,
        descricao: ideia.descricao,
        categoria: ideia.categoria || categoria,
        promptUsado: ideia.promptUsado,
      });
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setGerando(false);
    }
  };

  const copiar = async () => {
    if (!resultado) return;
    await navigator.clipboard.writeText(
      `${resultado.titulo}\n\n${resultado.descricao}`,
    );
    setToast({ show: true, msg: "Copiado!", icon: "copy" });
  };

  const salvar = async () => {
    if (!resultado) return;
    try {
      await salvarIdeia({
        titulo: resultado.titulo,
        descricao: resultado.descricao,
        tema: tema.trim(),
        categoria: resultado.categoria || categoria,
        promptUsado: resultado.promptUsado,
      });
      setResultado(null);
      setTema("");
      setToast({ show: true, msg: "Salvo no histórico", icon: "save" });
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="space-y-4">
        <Input
          placeholder="Tema da ideia"
          value={tema}
          onChange={(e) => setTema(e.target.value)}
          disabled={gerando}
        />
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS.map((c) => (
            <Badge
              key={c}
              variant={categoria === c ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setCategoria(c)}
            >
              {c}
            </Badge>
          ))}
        </div>
        <Button
          className="w-full"
          disabled={gerando || !tema.trim()}
          onClick={gerar}
        >
          {gerando && (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          {gerando ? "Gerando..." : "Gerar ideia"}
        </Button>

        {erro && (
          <Card className="border-destructive/50 bg-destructive/10">
          <CardHeader>
            <CardTitle>Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{erro}</p>
          </CardContent>
          </Card>
        )}

        {resultado && (
          <ResultadoGerar
            titulo={resultado.titulo}
            descricao={resultado.descricao}
            categoria={categoria}
            onCopiar={copiar}
            onSalvar={salvar}
          />
        )}
      </div>
      <AcaoToast
        visible={toast.show}
        message={toast.msg}
        icon={toast.icon}
        onComplete={() => setToast({ show: false, msg: "", icon: "check" })}
      />
    </div>
  );
}
