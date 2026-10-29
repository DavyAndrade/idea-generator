import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  listarIdeias,
  excluirIdeia,
  alternarFavorito,
} from "../lib/storage";
import type { Ideia, Categoria } from "../types";
import { CATEGORIAS } from "../types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { IdeiaCard } from "./ideia-card";

interface TelaHistoricoProps {
  recarregarTrigger?: number;
}

type CategoriaFiltro = Categoria | "Todas";

export function TelaHistorico({ recarregarTrigger }: TelaHistoricoProps) {
  const [busca, setBusca] = useState("");
  const [somenteFavoritas, setSomenteFavoritas] = useState(false);
  const [categoriaAtiva, setCategoriaAtiva] = useState<CategoriaFiltro>("Todas");
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

  const ideiasFiltradas = useMemo(() => {
    if (categoriaAtiva === "Todas") return ideias;
    return ideias.filter((i) => i.categoria === categoriaAtiva);
  }, [ideias, categoriaAtiva]);

  const ideiasPorCategoria = useMemo(() => {
    const grupos: Record<string, Ideia[]> = {};
    for (const i of ideiasFiltradas) {
      const cat = i.categoria || "Sem categoria";
      if (!grupos[cat]) grupos[cat] = [];
      grupos[cat].push(i);
    }
    return grupos;
  }, [ideiasFiltradas]);

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

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge
          variant={somenteFavoritas ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setSomenteFavoritas(!somenteFavoritas)}
        >
          Somente favoritas
        </Badge>

        {CATEGORIAS.map((c) => (
          <Badge
            key={c}
            variant={categoriaAtiva === c ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() =>
              setCategoriaAtiva(categoriaAtiva === c ? "Todas" : c)
            }
          >
            {c}
          </Badge>
        ))}
      </div>

      {carregando && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Carregando...
        </div>
      )}

      {erro && (
        <p className="py-4 text-sm text-destructive">{erro}</p>
      )}

      {!carregando && !erro && ideiasFiltradas.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {categoriaAtiva === "Todas"
            ? "Nenhuma ideia salva ainda."
            : `Nenhuma ideia na categoria "${categoriaAtiva}".`}
        </p>
      )}

      {!carregando && categoriaAtiva !== "Todas" && (
        <>
          {Object.entries(ideiasPorCategoria).map(([categoria, itens]) => (
            <div key={categoria} className="mb-6">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                {categoria} ({itens.length})
              </h3>
              {itens.map((ideia) => (
                <IdeiaCard
                  key={ideia.id}
                  ideia={ideia}
                  onCopiar={copiar}
                  onExcluir={excluir}
                  onAlternarFavorito={alternar}
                />
              ))}
            </div>
          ))}
        </>
      )}

      {!carregando && categoriaAtiva === "Todas" &&
        Object.entries(ideiasPorCategoria).map(([categoria, itens]) => (
          <div key={categoria} className="mb-6">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              {categoria} ({itens.length})
            </h3>
            {itens.map((ideia) => (
              <IdeiaCard
                key={ideia.id}
                ideia={ideia}
                onCopiar={copiar}
                onExcluir={excluir}
                onAlternarFavorito={alternar}
              />
            ))}
          </div>
        ))}
    </div>
  );
}
