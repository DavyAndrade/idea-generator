import { Moon, Sun, LogOut, Sparkles } from "lucide-react";
import { Button } from "./ui/button";

interface AppBarProps {
  dark: boolean;
  onToggleDark: () => void;
  onLogout?: () => void;
}

export function AppBar({
  dark,
  onToggleDark,
  onLogout,
}: AppBarProps) {
  return (
    <header className="border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">Lumi</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Alternar tema"
            onClick={onToggleDark}
          >
            {dark ? <Moon size={16} /> : <Sun size={16} />}
          </Button>
          {onLogout && (
            <Button
              variant="ghost"
              size="sm"
              aria-label="Sair"
              onClick={onLogout}
            >
              <LogOut size={16} />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
