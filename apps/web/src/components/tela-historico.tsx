import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import {
  listarIdeias,
  excluirIdeia,
  alternarFavorito,
} from "../lib/storage";
import type { Ideia } from "../types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { IdeiaCard } from "./ideia-card";

interface TelaHistoricoProps {
  recarregarTrigger?: number;
}

export function TelaHistorico({ recarregarTrigger }: TelaHistoricoProps) {
  const [busca, setBusca] = useState("");
  const [somenteFavoritas, setSomenteFavoritas] = useState(false);
  const [ideias, setIdeias] = useState<Ideia[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const lista = await listarIdeias({
        somenteFavoritas,
        busca,
      });
      setIdeias(lista);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, [somenteFavoritas, busca, recarregarTrigger]);

  const excluir = async (id: number) => {
    await excluirIdeia(id);
    carregar();
  };

  const alternar = async (ideia: Ideia) => {
    await alternarFavorito(ideia.id, ideia.favorito);
    carregar();
  };

  const copiar = async (ideia: Ideia) => {
    await navigator.clipboard.writeText(
      `${ideia.titulo}\n\n${ideia.descricao}`,
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Buscar ideias..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-10"
        />
      </div>

      <Badge
        variant={somenteFavoritas ? "default" : "outline"}
        className="mb-4 cursor-pointer"
        onClick={() => setSomenteFavoritas(!somenteFavoritas)}
      >
        Somente favoritas
      </Badge>

      {carregando && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Carregando...
        </div>
      )}

      {erro && (
        <p className="py-4 text-sm text-destructive">{erro}</p>
      )}

      {!carregando && !erro && ideias.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nenhuma ideia salva ainda.
        </p>
      )}

      {!carregando &&
        ideias.map((ideia) => (
          <IdeiaCard
            key={ideia.id}
            ideia={ideia}
            onCopiar={copiar}
            onExcluir={excluir}
            onAlternarFavorito={alternar}
          />
        ))}
    </div>
  );
}
