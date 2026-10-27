import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/redefinir-senha")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nova senha — Liga Amadora" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    // Se nenhum link válido for reconhecido em alguns segundos, mostra o aviso.
    const t = setTimeout(() => setReady((r) => (r === null ? false : r)), 2500);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== repeat) {
      toast.error("As senhas não são iguais.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível trocar a senha. Peça um link novo.");
      return;
    }
    toast.success("Senha alterada.");
    navigate({ to: "/campeonatos", replace: true });
  }

  return (
    <main className="pitch-glow flex min-h-screen flex-col justify-center px-5 py-12">
      <div className="mx-auto w-full max-w-md">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Liga Amadora</p>
        <h1 className="mt-2 text-4xl text-foreground">Nova senha</h1>

        {ready === false ? (
          <div className="mt-8 rounded-2xl bg-card p-5 text-sm text-muted-foreground">
            Este link é inválido ou já expirou. Peça um novo na tela de entrada, em “Esqueci minha senha”.
            <Link to="/auth" className="mt-4 block font-medium text-primary">
              Voltar para entrar
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-card"
                placeholder="mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repeat-password">Repetir nova senha</Label>
              <Input
                id="repeat-password"
                type="password"
                autoComplete="new-password"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
                className="h-12 bg-card"
              />
            </div>
            <Button type="submit" disabled={loading || !ready} className="h-12 w-full text-base font-semibold">
              Salvar nova senha
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
