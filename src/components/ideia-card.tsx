import { Copy, Plus, Trash2, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import type { Ideia } from "../types";

interface IdeiaCardProps {
  ideia: Ideia;
  onCopiar: (ideia: Ideia) => void;
  onExcluir: (id: number) => void;
  onAlternarFavorito: (ideia: Ideia) => void;
}

export function IdeiaCard({
  ideia,
  onCopiar,
  onExcluir,
  onAlternarFavorito,
}: IdeiaCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{ideia.titulo}</CardTitle>
        <Badge variant="outline" className="mt-1 w-fit">
          {ideia.categoria}
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {ideia.descricao}
        </p>
      </CardContent>
      <div className="flex items-center justify-end gap-1 p-3">
        <Button variant="ghost" size="sm" onClick={() => onAlternarFavorito(ideia)}>
          <Star
            size={16}
            className={ideia.favorito ? "fill-yellow-400 text-yellow-400" : ""}
          />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onCopiar(ideia)}>
          <Copy size={14} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onExcluir(ideia.id)}
        >
          <Trash2 size={14} className="text-destructive" />
        </Button>
      </div>
    </Card>
  );
}

// ResultadoGerar: used only on the Gerar tab for the generated result card
export function ResultadoGerar({
  titulo,
  descricao,
  categoria,
  onCopiar,
  onSalvar,
  onDescartar,
}: {
  titulo: string;
  descricao: string;
  categoria: string;
  onCopiar: () => void;
  onSalvar: () => void;
  onDescartar?: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        <Badge variant="outline" className="mt-1 w-fit">
          {categoria}
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="text-sm whitespace-pre-wrap">{descricao}</p>
      </CardContent>
      <div className="flex items-center justify-end gap-1 p-3">
        {onDescartar && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDescartar}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 size={14} className="mr-1" />
            Descartar
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onCopiar}>
          <Copy size={14} />
        </Button>
        <Button size="sm" onClick={onSalvar}>
          <Plus size={14} />
          Salvar
        </Button>
      </div>
    </Card>
  );
}
