import { Moon, Sun } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface AppBarProps {
  dark: boolean;
  onToggleDark: () => void;
}

export function AppBar({ dark, onToggleDark }: AppBarProps) {
  return (
    <header className="border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex h-14 items-center justify-between px-4">
        <h1 className="text-lg font-semibold">Gerador de Ideias</h1>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            Turso + PWA
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Alternar tema"
            onClick={onToggleDark}
          >
            {dark ? <Moon size={16} /> : <Sun size={16} />}
          </Button>
        </div>
      </div>
    </header>
  );
}
