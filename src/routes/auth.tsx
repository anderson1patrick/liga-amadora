import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Liga Amadora" },
      { name: "description", content: "Acesse sua conta para gerenciar seus campeonatos." },
      { property: "og:title", content: "Entrar — Liga Amadora" },
      { property: "og:description", content: "Acesse sua conta para gerenciar seus campeonatos." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/campeonatos", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      toast.error("Informe um e-mail válido e uma senha com pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Conta criada! Confirme o e-mail que enviamos para entrar.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
      navigate({ to: "/campeonatos", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot() {
    if (!email.trim()) {
      toast.error("Digite seu e-mail acima e toque de novo em Esqueci minha senha.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setLoading(false);
    if (error) toast.error("Não foi possível enviar o e-mail agora. Tente mais tarde.");
    else toast.success("Se o e-mail estiver cadastrado, enviamos um link para criar uma nova senha.");
  }

  return (
    <main className="pitch-glow flex min-h-screen flex-col justify-center px-5 py-12">
      <div className="mx-auto w-full max-w-md">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
          Liga Amadora
        </p>
        <h1 className="mt-2 text-4xl text-foreground">
          {mode === "signin" ? "Entrar" : "Criar conta"}
        </h1>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 bg-card"
              placeholder="voce@email.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 bg-card"
              placeholder="mínimo 6 caracteres"
            />
          </div>
          <Button type="submit" disabled={loading} className="h-12 w-full text-base font-semibold">
            {mode === "signin" ? "Entrar" : "Criar conta"}
          </Button>
          {mode === "signin" && (
            <button
              type="button"
              onClick={handleForgot}
              disabled={loading}
              className="w-full text-center text-sm text-primary"
            >
              Esqueci minha senha
            </button>
          )}
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-6 w-full text-center text-sm text-muted-foreground underline underline-offset-4"
        >
          {mode === "signin" ? "Ainda não tenho conta" : "Já tenho conta"}
        </button>
      </div>
    </main>
  );
}
