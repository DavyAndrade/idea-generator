import { Moon, Sun, LogOut, Sparkles } from "lucide-react";
import { Button } from "./ui/button";

interface AppBarProps {
  dark: boolean;
  onToggleDark: () => void;
  usuarioNome?: string;
  onLogout?: () => void;
}

export function AppBar({
  dark,
  onToggleDark,
  usuarioNome,
  onLogout,
}: AppBarProps) {
  const primeiroNome = usuarioNome?.split(/[ \t]+/)[0] ?? "";

  return (
    <header className="border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">Lumi</h1>
        </div>
        <div className="flex items-center gap-2">
          {primeiroNome && (
            <span className="text-sm text-muted-foreground">
              {primeiroNome}
            </span>
          )}
          {onLogout && primeiroNome && (
            <Button
              variant="ghost"
              size="sm"
              aria-label="Sair"
              onClick={onLogout}
            >
              <LogOut size={16} />
            </Button>
          )}
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
