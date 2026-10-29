import { useState } from "react";
import { Eye, EyeOff, Check, X } from "lucide-react";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { ModalChaveRecuperacao } from "./modal-chave-recuperacao";
import {
  registrarUsuario,
  loginUsuario,
  gerarChaveRecuperacao,
  salvarEnvelopeRecuperacao,
  solicitarRecuperacaoSenha,
} from "@/lib/storage";
import type { UsuarioSessao } from "@/types";

type Modo = "entrar" | "criar" | "esqueci";

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

  // Modal de chave de recuperação
  const [mostrarModalRecuperacao, setMostrarModalRecuperacao] = useState(false);
  const [chaveRecuperacao, setChaveRecuperacao] = useState("");
  const [sessaoPendente, setSessaoPendente] = useState<UsuarioSessao | null>(null);

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
    if (modo === "esqueci") {
      if (!email.trim()) return "Digite seu e-mail.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        return "E-mail inválido.";
      return null;
    }

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

    if (modo === "esqueci") {
      const valido = validar();
      if (valido) {
        setErro(valido);
        return;
      }
      setCarregando(true);
      try {
        const r = await solicitarRecuperacaoSenha(email.trim());
        if (!r.ok) {
          setErro(r.mensagem);
        } else {
          setErro(null);
          alert(r.mensagem);
          setModo("entrar");
        }
      } catch (e: unknown) {
        setErro(e instanceof Error ? e.message : "Erro ao solicitar recuperação.");
      } finally {
        setCarregando(false);
      }
      return;
    }

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

      if (modo === "criar") {
        // Gera e salva a chave de recuperação após registro
        const chave = gerarChaveRecuperacao();
        setChaveRecuperacao(chave);
        try {
          await salvarEnvelopeRecuperacao(chave);
        } catch {
          // Fallback: chave gerada mas não salva no servidor — usuário deve anotar
        }
        setSessaoPendente(sessao);
        setMostrarModalRecuperacao(true);
      } else {
        onAutenticado(sessao);
      }
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao autenticar.");
    } finally {
      setCarregando(false);
    }
  };

  const handleFecharModalRecuperacao = () => {
    setMostrarModalRecuperacao(false);
    if (sessaoPendente) {
      onAutenticado(sessaoPendente);
      setSessaoPendente(null);
    }
  };

  return (
    <>
      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>
              {modo === "entrar"
                ? "Entrar no Lumi"
                : modo === "criar"
                ? "Criar conta no Lumi"
                : "Esqueci a senha"}
            </CardTitle>
            <CardDescription>
              {modo === "entrar"
                ? "Acesse sua conta para sincronizar suas ideias e chave de API."
                : modo === "criar"
                ? "Crie sua conta para iluminar novas ideias com IA."
                : "Digite seu e-mail para receber instruções de recuperação."}
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
                    onChange={(e) => setNome(e.target.value)}
                    disabled={carregando}
                    autoComplete="name"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">E-mail</label>
                <Input
                  type="email"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={carregando}
                  autoComplete={modo === "entrar" ? "username" : "email"}
                />
              </div>

              {modo !== "esqueci" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Senha</label>
                  <div className="relative">
                    <Input
                      type={mostrarSenha ? "text" : "password"}
                      placeholder="Sua senha"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      disabled={carregando}
                      autoComplete={
                        modo === "entrar" ? "current-password" : "new-password"
                      }
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                      aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                      aria-pressed={mostrarSenha}
                    >
                      {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {modo === "criar" && senha && (
                    <ul className="mt-2 space-y-1 text-xs">
                      {REQUISITOS_SENHA.map((r, i) => {
                        const ok = senhasValidas[i];
                        return (
                          <li
                            key={r.label}
                            className="flex items-center gap-1 text-muted-foreground"
                          >
                            {ok ? (
                              <Check size={12} className="text-green-500" />
                            ) : (
                              <X size={12} className="text-red-500" />
                            )}
                            <span
                              className={ok ? "text-green-600" : "text-red-600"}
                            >
                              {r.label}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}

              {erro && <p className="text-sm text-destructive">{erro}</p>}

              <Button
                type="submit"
                className="w-full"
                disabled={carregando || (modo === "criar" && !todasSenhasOk)}
              >
                {carregando
                  ? modo === "entrar"
                    ? "Entrando..."
                    : modo === "criar"
                    ? "Criando conta..."
                    : "Enviando..."
                  : modo === "entrar"
                  ? "Entrar"
                  : modo === "criar"
                  ? "Criar conta"
                  : "Enviar link de recuperação"}
              </Button>
            </form>

            <div className="mt-4 flex justify-center">
              {modo === "esqueci" ? (
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={() => {
                    setModo("entrar");
                    setErro(null);
                  }}
                  disabled={carregando}
                >
                  ← Voltar para entrar
                </button>
              ) : (
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={() => {
                    setModo(modo === "criar" ? "entrar" : "criar");
                    setErro(null);
                  }}
                  disabled={carregando}
                >
                  {modo === "criar"
                    ? "Já tem conta? Entrar"
                    : "Não tem conta? Criar conta"}
                </button>
              )}
            </div>

            {modo === "entrar" && (
              <button
                type="button"
                className="mt-2 block w-full text-center text-sm text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setModo("esqueci");
                  setNome("");
                  setSenha("");
                  setErro(null);
                }}
                disabled={carregando}
              >
                Esqueci minha senha
              </button>
            )}
          </CardContent>
        </Card>
      </main>

      <ModalChaveRecuperacao
        open={mostrarModalRecuperacao}
        onOpenChange={(aberto) => {
          setMostrarModalRecuperacao(aberto);
          if (!aberto && sessaoPendente) {
            onAutenticado(sessaoPendente);
            setSessaoPendente(null);
          }
        }}
        chaveRecuperacao={chaveRecuperacao}
        onClose={handleFecharModalRecuperacao}
      />
    </>
  );
}
