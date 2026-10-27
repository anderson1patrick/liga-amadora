import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, Copy, ListOrdered, MessageCircle, RefreshCw, Share2, Shirt, Target, Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { championshipQuery } from "@/lib/champ-data";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/c/$id")({
  component: ChampionshipLayout,
});

const tabs = [
  { to: "/c/$id/tabela", label: "Tabela", icon: Trophy },
  { to: "/c/$id/partidas", label: "Partidas", icon: ListOrdered },
  { to: "/c/$id/times", label: "Times", icon: Shirt },
  { to: "/c/$id/rankings", label: "Artilharia", icon: Target },
] as const;

function ShareDialog({ id, open, onOpenChange }: { id: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const { data } = useQuery(championshipQuery(id));
  const champ = data?.championship as unknown as { name: string; is_public?: boolean; public_token?: string | null; is_listed?: boolean; city?: string | null } | undefined;
  const [city, setCity] = useState<string | null>(null);
  const cityValue = city ?? champ?.city ?? "";
  const enabled = !!champ?.is_public && !!champ?.public_token;
  const url = enabled ? `${window.location.origin}/p/${champ!.public_token}` : "";

  const setLink = useMutation({
    mutationFn: async (args: { enabled: boolean; regenerate?: boolean }) => {
      const { error } = await supabase.rpc("set_public_link" as never, {
        _championship_id: id,
        _enabled: args.enabled,
        _regenerate: args.regenerate ?? false,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["championship", id] }),
    onError: () => toast.error("Não foi possível atualizar o link. Tente de novo."),
  });

  const setListing = useMutation({
    mutationFn: async (args: { listed: boolean; city: string }) => {
      const { error } = await supabase.rpc("set_listing" as never, {
        _championship_id: id,
        _listed: args.listed,
        _city: args.city,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["championship", id] }),
    onError: () => toast.error("Não foi possível salvar. Tente de novo."),
  });

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o link e copie manualmente.");
    }
  }

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`Acompanhe o ${champ?.name ?? "campeonato"}: ${url}`)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Link público</DialogTitle>
          <DialogDescription>
            Quem tem o link vê tabela, jogos, times e artilharia. Só você edita.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-xl bg-card p-3">
          <span className="text-sm font-medium">Ativar link público</span>
          <Switch
            checked={enabled}
            disabled={setLink.isPending}
            onCheckedChange={(v) => setLink.mutate({ enabled: v })}
          />
        </div>

        {enabled && (
          <div className="space-y-3">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={copy}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground"
              >
                <Copy className="size-4" /> Copiar
              </button>
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm"
              >
                <MessageCircle className="size-4" /> WhatsApp
              </a>
            </div>
            <div className="rounded-xl bg-card p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">Aparecer na busca do app</span>
                <Switch
                  checked={!!champ?.is_listed}
                  disabled={setListing.isPending}
                  onCheckedChange={(v) => setListing.mutate({ listed: v, city: cityValue })}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Desligado, só entra quem tem o link. Ligado, qualquer pessoa acha pelo nome ou cidade.
              </p>
              <input
                value={cityValue}
                onChange={(e) => setCity(e.target.value)}
                onBlur={() => setListing.mutate({ listed: !!champ?.is_listed, city: cityValue })}
                placeholder="Cidade (opcional)"
                aria-label="Cidade do campeonato"
                className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
            </div>
            <button
              type="button"
              disabled={setLink.isPending}
              onClick={() => {
                if (window.confirm("O link antigo vai parar de funcionar. Gerar um novo?")) {
                  setLink.mutate({ enabled: true, regenerate: true });
                }
              }}
              className="flex items-center gap-2 text-xs text-destructive"
            >
              <RefreshCw className="size-3.5" /> Gerar novo link (o antigo deixa de funcionar)
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ChampionshipLayout() {
  const { id } = Route.useParams();
  const { data } = useQuery(championshipQuery(id));
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div className="min-h-screen pb-24">
      <header className="pitch-glow sticky top-0 z-20 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 bg-background/90 px-4 py-4 backdrop-blur">
        <Link
          to="/campeonatos"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-card"
          aria-label="Voltar"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-2xl leading-tight text-foreground">
            {data?.championship.name ?? "Campeonato"}
          </h1>
          <p className="truncate text-xs uppercase tracking-widest text-muted-foreground">
            {data?.championship.season ? `${data.championship.season} · ` : ""}
            {data?.championship.format === "double" ? "Turno e returno" : "Turno único"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-card"
          aria-label="Compartilhar link público"
        >
          <Share2 className="size-4" />
        </button>
      </header>

      <Outlet />

      <ShareDialog id={id} open={shareOpen} onOpenChange={setShareOpen} />

      <nav className="m3-nav fixed inset-x-0 bottom-0 z-30 border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              params={{ id }}
              className="m3-item"
            >
              <span className="m3-pill">
                <t.icon className="size-5" />
              </span>
              {t.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
