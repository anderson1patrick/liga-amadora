import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut, Plus, Trophy, Trash2, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { championshipsQuery } from "@/lib/champ-data";
import { accessInfo, useAccount } from "@/lib/account";
import { formatBR } from "@/lib/billing";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/campeonatos")({
  head: () => ({
    meta: [
      { title: "Meus campeonatos — Liga Amadora" },
      { name: "description", content: "Crie e gerencie seus campeonatos de futebol." },
      { property: "og:title", content: "Meus campeonatos — Liga Amadora" },
      { property: "og:description", content: "Crie e gerencie seus campeonatos de futebol." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChampionshipsPage,
});

function ChampionshipsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(championshipsQuery());
  const account = useAccount();
  const access = accessInfo(account.data);
  const days = (n: number) => `${n} ${n === 1 ? "dia" : "dias"}`;
  const banner = !access.ready
    ? null
    : access.blocked
      ? { text: "Conta bloqueada", action: "Ver", style: "bg-destructive/15 text-destructive" }
      : access.expired
        ? { text: `Seu acesso venceu em ${formatBR(access.endDate)}`, action: "Renovar", style: "bg-destructive/15 text-destructive" }
        : access.dueToday
          ? { text: "Sua assinatura vence hoje", action: "Como renovar", style: "bg-champion/15 text-champion" }
          : access.subscribed
            ? access.daysLeft <= 3
              ? { text: `Sua assinatura vence em ${days(access.daysLeft)}`, action: "Ver", style: "bg-card" }
              : null
            : { text: `Faltam ${days(access.daysLeft)} do seu teste grátis`, action: "Ver plano", style: "bg-card" };
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);
  const [name, setName] = useState("");
  const [season, setSeason] = useState(String(new Date().getFullYear()));
  const [format, setFormat] = useState<"single" | "double">("double");

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: created, error } = await supabase
        .from("championships")
        .insert({ name: name.trim(), season: season.trim() || null, format })
        .select()
        .single();
      if (error) throw error;
      return created;
    },
    onSuccess: (created) => {
      setOpen(false);
      setName("");
      queryClient.invalidateQueries({ queryKey: ["championships"] });
      navigate({ to: "/c/$id/times", params: { id: created.id } });
    },
    onError: () => toast.error("Não foi possível criar o campeonato."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("championships").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campeonato excluído.");
      queryClient.invalidateQueries({ queryKey: ["championships"] });
    },
  });

  useEffect(() => {
    if (account.data && !account.data.onboarded) navigate({ to: "/bem-vindo", replace: true });
  }, [account.data, navigate]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="pitch-glow min-h-screen px-5 pb-16 pt-10">
      <div className="mx-auto w-full max-w-md">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              Liga Amadora
            </p>
            <h1 className="truncate text-3xl text-foreground">Meus campeonatos</h1>
          </div>
          <div className="flex items-center">
            <Button asChild variant="ghost" size="icon" aria-label="Conta">
              <Link to="/conta">
                <UserRound className="size-5" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sair">
              <LogOut className="size-5" />
            </Button>
          </div>
        </header>

        {banner && (
          <Link
            to="/assinar"
            className={`mt-4 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm ${banner.style}`}
          >
            <span>{banner.text}</span>
            <span className="shrink-0 text-xs font-semibold">{banner.action}</span>
          </Link>
        )}

        <Dialog
          open={open}
          onOpenChange={(o) => {
            if (o && access.ready && !access.hasAccess) {
              navigate({ to: "/assinar" });
              return;
            }
            setOpen(o);
          }}
        >
          <DialogTrigger asChild>
            <Button className="mt-6 h-13 w-full gap-2 py-4 text-base font-semibold">
              <Plus className="size-5" /> Novo campeonato
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[92vw] rounded-2xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Novo campeonato</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="champ-name">Nome</Label>
                <Input
                  id="champ-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  placeholder="Copa do Bairro"
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="champ-season">Temporada</Label>
                <Input
                  id="champ-season"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  maxLength={20}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>Formato</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={format === "single" ? "default" : "outline"}
                    onClick={() => setFormat("single")}
                    className="h-12"
                  >
                    Turno único
                  </Button>
                  <Button
                    type="button"
                    variant={format === "double" ? "default" : "outline"}
                    onClick={() => setFormat("double")}
                    className="h-12"
                  >
                    Turno e returno
                  </Button>
                </div>
              </div>
              <Button
                className="h-12 w-full font-semibold"
                disabled={!name.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                Criar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="mt-6 space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {!isLoading && (data?.length ?? 0) === 0 && (
            <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
              Você ainda não tem campeonatos. Crie o primeiro acima.
            </p>
          )}
          {data?.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-2xl bg-card p-4">
              <Link
                to="/c/$id/tabela"
                params={{ id: c.id }}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <Trophy className="size-5 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-card-foreground">
                    {c.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {c.season ? `${c.season} · ` : ""}
                    {c.format === "double" ? "Turno e returno" : "Turno único"}
                  </span>
                </span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Excluir campeonato"
                onClick={() => setToDelete({ id: c.id, name: c.name })}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => {
          if (!o) setToDelete(null);
        }}
        title="Excluir campeonato?"
        description={`"${toDelete?.name ?? ""}" e todos os seus times, jogadores e partidas serão apagados. Não dá para desfazer.`}
        confirmLabel="Excluir"
        onConfirm={() => {
          if (toDelete) deleteMutation.mutate(toDelete.id);
          setToDelete(null);
        }}
      />
    </main>
  );
}
