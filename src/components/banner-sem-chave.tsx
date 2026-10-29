import { KeySquare } from "lucide-react";
import { Badge } from "./ui/badge";

interface BannerSemChaveProps {
  onClick: () => void;
}

export function BannerSemChave({ onClick }: BannerSemChaveProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-3 border-b bg-destructive/10 px-4 py-3 text-left text-destructive transition-colors hover:bg-destructive/15"
    >
      <KeySquare size={18} />
      <span className="flex-1 text-sm font-medium">
        Configure sua chave de API do Gemini
      </span>
      <Badge variant="secondary" className="text-xs">
        Config
      </Badge>
    </button>
  );
}
