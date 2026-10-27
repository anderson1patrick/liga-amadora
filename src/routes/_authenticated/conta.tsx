import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ChevronLeft, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsAdmin } from "@/lib/account";

export const Route = createFileRoute("/_authenticated/conta")({
  head: () => ({
    meta: [
      { title: "Conta — Liga Amadora" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = useIsAdmin();
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function leave() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    navigate({ to: "/", replace: true });
  }

  async function deleteAccount() {
    setLoading(true);
    const { error } = await supabase.rpc("delete_my_account" as never);
    if (error) {
      setLoading(false);
      toast.error("Não foi possível excluir a conta. Tente de novo.");
      return;
    }
    toast.success("Conta excluída.");
    await leave();
  }

  const canDelete = confirm.trim().toLowerCase() === "excluir";

  return (
    <main className="pitch-glow min-h-screen px-5 pb-16 pt-10">
      <div className="mx-auto w-full max-w-md">
        <header className="flex items-center gap-3">
          <Link
            to="/campeonatos"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-card"
            aria-label="Voltar"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <h1 className="text-3xl text-foreground">Conta</h1>
        </header>

        <section className="mt-6 rounded-2xl bg-card p-4">
          <p className="text-xs text-muted-foreground">Entrou como</p>
          <p className="mt-0.5 break-all text-sm">{user.email}</p>
          <Button variant="outline" className="mt-4 h-11 w-full gap-2" onClick={leave}>
            <LogOut className="size-4" /> Sair
          </Button>
          {isAdmin.data && (
            <Button asChild variant="outline" className="mt-2 h-11 w-full">
              <Link to="/admin">Painel admin</Link>
            </Button>
          )}
        </section>

        <section className="mt-4 rounded-2xl border border-destructive/60 p-4">
          <h2 className="flex items-center gap-2 font-semibold text-destructive">
            <AlertTriangle className="size-4" /> Excluir conta
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Apaga sua conta e todos os seus campeonatos, times, jogadores, partidas e links públicos. Não dá
            para desfazer.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">Digite excluir para confirmar</p>
          <Input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            aria-label="Confirmação para excluir a conta"
            className="mt-1 h-11"
          />
          <Button
            variant="destructive"
            className="mt-3 h-12 w-full font-semibold"
            disabled={!canDelete || loading}
            onClick={deleteAccount}
          >
            Excluir minha conta
          </Button>
        </section>
      </div>
    </main>
  );
}
