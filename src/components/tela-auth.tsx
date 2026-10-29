import { useState } from "react";
import { Eye, EyeOff, Check, X } from "lucide-react";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { registrarUsuario, loginUsuario } from "@/lib/storage";
import type { UsuarioSessao } from "@/types";

type Modo = "entrar" | "criar";

interface TelaAuthProps {
  onAutenticado: (sessao: UsuarioSessao) => void;
}

interface ReqSenha {
  label: string;
  ok: (s: string) => boolean;
}

const REQUISITOS_SENHA: ReqSenha[] = [
  { label: "Pelo menos 8 caracteres", ok: (s) => s.length >= 8 },
  { label: "Pelo menos 1 letra maiúscula", ok: (s) => /[A-Z]/.test(s) },
  { label: "Pelo menos 1 letra minúscula", ok: (s) => /[a-z]/.test(s) },
  { label: "Pelo menos 1 número", ok: (s) => /[0-9]/.test(s) },
  { label: "Pelo menos 1 caractere especial", ok: (s) => /[^A-Za-z0-9]/.test(s) },
];

export function TelaAuth({ onAutenticado }: TelaAuthProps) {
  const [modo, setModo] = useState<Modo>("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const limparErro = () => setErro(null);

  const alternarModo = () => {
    setModo((m) => (m === "entrar" ? "criar" : "entrar"));
    setNome("");
    setEmail("");
    setSenha("");
    limparErro();
  };

  const senhasValidas = REQUISITOS_SENHA.map((r) => r.ok(senha));
  const todasSenhasOk = senhasValidas.every(Boolean);

  const validar = (): string | null => {
    if (!email.trim()) return "Digite seu e-mail.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return "E-mail inválido.";

    if (modo === "entrar") {
      if (!senha) return "Digite sua senha.";
      return null;
    }

    if (!nome.trim()) return "Digite seu nome.";
    if (!senha) return "Digite uma senha.";
    if (!todasSenhasOk) return "A senha não atende a todos os requisitos de segurança.";
    return null;
  };

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault();
    limparErro();

    const valido = validar();
    if (valido) {
      setErro(valido);
      return;
    }

    setCarregando(true);
    try {
      const sessao =
        modo === "entrar"
          ? await loginUsuario({ email: email.trim(), senha })
          : await registrarUsuario({
              nome: nome.trim(),
              email: email.trim(),
              senha,
            });
      onAutenticado(sessao);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao autenticar.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            {modo === "entrar" ? "Entrar no Lumi" : "Criar conta no Lumi"}
          </CardTitle>
          <CardDescription>
            {modo === "entrar"
              ? "Acesse sua conta para sincronizar suas ideias e chave de API."
              : "Crie sua conta para iluminar novas ideias com IA."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={submeter} className="space-y-4">
            {modo === "criar" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome</label>
                <Input
                  type="text"
                  placeholder="Seu nome"
                  value={nome}
                  onChange={(e) => {
                    setNome(e.target.value);
                    limparErro();
                  }}
                  autoComplete="name"
                  disabled={carregando}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">E-mail</label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  limparErro();
                }}
                autoComplete="email"
                disabled={carregando}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Senha</label>
              <div className="relative">
                <Input
                  type={mostrarSenha ? "text" : "password"}
                  placeholder={modo === "criar" ? "Crie uma senha forte" : "Sua senha"}
                  value={senha}
                  onChange={(e) => {
                    setSenha(e.target.value);
                    limparErro();
                  }}
                  autoComplete={modo === "criar" ? "new-password" : "current-password"}
                  disabled={carregando}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={mostrarSenha ? "Ocultar senha" : "Exibir senha"}
                  tabIndex={-1}
                >
                  {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {modo === "criar" && (
                <div className="mt-2 space-y-1.5 rounded-lg border bg-muted/40 p-3 text-xs">
                  <p className="font-medium text-foreground">Sua senha deve conter:</p>
                  <ul className="space-y-1">
                    {REQUISITOS_SENHA.map((req, i) => {
                      const ok = senhasValidas[i];
                      return (
                        <li
                          key={req.label}
                          className={`flex items-center gap-1.5 transition-colors ${
                            ok ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"
                          }`}
                        >
                          {ok ? (
                            <Check size={13} className="shrink-0 stroke-[2.5]" />
                          ) : (
                            <X size={13} className="shrink-0 stroke-[2.5]" />
                          )}
                          <span>{req.label}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {erro && <p className="text-sm text-destructive">{erro}</p>}

            <Button
              type="submit"
              className="w-full"
              disabled={carregando || (modo === "criar" && !todasSenhasOk)}
            >
              {carregando
                ? "Aguarde..."
                : modo === "entrar"
                ? "Entrar"
                : "Criar conta"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={alternarModo}
              disabled={carregando}
            >
              {modo === "criar"
                ? "Já tem conta? Entrar"
                : "Não tem conta? Criar conta"}
            </button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
