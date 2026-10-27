import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronRight, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { championshipQuery, computePlayerStats } from "@/lib/champ-data";
import { TeamCrest } from "@/components/TeamCrest";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/c/$id/times")({
  head: () => ({
    meta: [
      { title: "Times — Liga Amadora" },
      { name: "description", content: "Clubes do campeonato e seus elencos." },
      { property: "og:title", content: "Times — Liga Amadora" },
      { property: "og:description", content: "Clubes do campeonato e seus elencos." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TeamsPage,
});

const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#eab308", "#a855f7", "#f97316", "#e5e7eb"];

function TeamsPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(championshipQuery(id));
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [color, setColor] = useState(COLORS[0]!);
  const [crestUrl, setCrestUrl] = useState<string | null>(null);

  const stats = data ? computePlayerStats(data) : null;

  const createTeam = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("teams").insert({
        championship_id: id,
        name: name.trim(),
        short_name: shortName.trim() || name.trim().slice(0, 3).toUpperCase(),
        color,
        crest_url: crestUrl,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setOpen(false);
      setName("");
      setShortName("");
      setCrestUrl(null);
      queryClient.invalidateQueries({ queryKey: ["championship", id] });
    },
    onError: () => toast.error("Não foi possível salvar o time."),
  });


  return (
    <div className="mx-auto w-full max-w-md px-4 pt-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="h-12 w-full gap-2 font-semibold">
            <Plus className="size-5" /> Novo time
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[92vw] rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo time</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Nome</Label>
              <Input
                id="team-name"
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
                className="h-12"
                placeholder="Unidos da Vila"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-short">Sigla</Label>
              <Input
                id="team-short"
                value={shortName}
                maxLength={5}
                onChange={(e) => setShortName(e.target.value.toUpperCase())}
                className="h-12"
                placeholder="UNV"
              />
            </div>
            <div className="space-y-2">
              <Label>Cor principal</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Cor ${c}`}
                    onClick={() => setColor(c)}
                    className={`size-9 rounded-full border-2 ${color === c ? "border-primary" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-crest">Link do escudo (opcional)</Label>
              <Input
                id="team-crest"
                inputMode="url"
                className="h-12"
                placeholder="https://..."
                value={crestUrl ?? ""}
                onChange={(e) => setCrestUrl(e.target.value.trim() || null)}
              />
              {crestUrl && (
                <img src={crestUrl} alt="Escudo" className="size-12 rounded-full object-cover" />
              )}
            </div>
            <Button
              className="h-12 w-full font-semibold"
              disabled={!name.trim() || createTeam.isPending}
              onClick={() => createTeam.mutate()}
            >
              Salvar time
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mt-4 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {!isLoading && data?.teams.length === 0 && (
          <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
            Nenhum time cadastrado ainda.
          </p>
        )}
        {data?.teams.map((team) => {
          const squad = data.players.filter((p) => p.team_id === team.id);
          const suspended = squad.filter((p) => (stats?.get(p.id)?.suspendedMatches ?? 0) > 0);
          return (
            <Link
              key={team.id}
              to="/c/$id/elenco/$teamId"
              params={{ id, teamId: team.id }}
              className="flex items-center gap-3 rounded-2xl bg-card p-4"
            >
              <TeamCrest team={team} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{team.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {squad.length} jogador{squad.length === 1 ? "" : "es"}
                  {suspended.length > 0 && ` · ${suspended.length} suspenso(s)`}
                </span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
