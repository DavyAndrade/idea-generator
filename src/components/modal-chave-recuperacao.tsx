import { Fragment, useState } from "react";
import { X, Copy, Check } from "lucide-react";

import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";

interface ModalChaveRecuperacaoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chaveRecuperacao: string;
  onClose?: () => void;
}

export function ModalChaveRecuperacao({
  open,
  onOpenChange,
  chaveRecuperacao,
  onClose,
}: ModalChaveRecuperacaoProps) {
  const [copiado, setCopiado] = useState(false);
  const [salvo, setSalvo] = useState(false);

  const copiarChave = async () => {
    try {
      await navigator.clipboard.writeText(chaveRecuperacao);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // fallback: seleciona o texto
    }
  };

  const handleSalvarCheckbox = () => setSalvo(!salvo);

  const handleClose = () => {
    if (salvo && onClose) {
      onClose();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>Sua Chave de Recuperação Lumi</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Guarde esta chave em um local seguro. Ela será usada para recuperar
            o acesso à sua conta e ideias criptografadas em caso de perda de senha.
          </p>

          <div className="flex items-center justify-center rounded-lg bg-muted p-4 font-mono text-xl tracking-widest select-all">
            {chaveRecuperacao}
            <button
              type="button"
              className="ml-3 rounded p-1 text-muted-foreground hover:text-foreground"
              onClick={copiarChave}
              aria-label={copiado ? "Copiado!" : "Copiar chave"}
              title={copiado ? "Copiado!" : "Copiar chave"}
            >
              {copiado ? (
                <Check size={16} className="text-green-500" />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={salvo}
              onChange={handleSalvarCheckbox}
              className="h-4 w-4 rounded border-border"
            />
            <span>Confirmo que salvei esta chave em um local seguro</span>
          </label>
        </div>

        <DialogFooter>
          <Button onClick={handleClose} disabled={!salvo}>
            Entendi, continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
