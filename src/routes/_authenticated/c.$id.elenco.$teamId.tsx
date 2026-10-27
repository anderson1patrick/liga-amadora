import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { championshipQuery, computePlayerStats, POSITIONS } from "@/lib/champ-data";
import { TeamCrest } from "@/components/TeamCrest";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/c/$id/elenco/$teamId")({
  head: () => ({
    meta: [
      { title: "Elenco — Liga Amadora" },
      { name: "description", content: "Jogadores do time, gols, cartões e suspensões." },
      { property: "og:title", content: "Elenco — Liga Amadora" },
      { property: "og:description", content: "Jogadores do time, gols, cartões e suspensões." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SquadPage,
});

const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#eab308", "#a855f7", "#f97316", "#e5e7eb"];

function SquadPage() {
  const { id, teamId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useQuery(championshipQuery(id));

  // jogador (novo ou edição)
  const [playerOpen, setPlayerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [position, setPosition] = useState<string>("MEI");
  const [shirt, setShirt] = useState("");
  const [toRemove, setToRemove] = useState<{ id: string; name: string } | null>(null);

  // time (edição e exclusão)
  const [teamOpen, setTeamOpen] = useState(false);
  const [tName, setTName] = useState("");
  const [tShort, setTShort] = useState("");
  const [tColor, setTColor] = useState(COLORS[0]!);
  const [tCrest, setTCrest] = useState("");
  const [confirmTeam, setConfirmTeam] = useState(false);

  const team = data?.teams.find((t) => t.id === teamId);
  const stats = data ? computePlayerStats(data) : null;
  const squad = (data?.players ?? [])
    .filter((p) => p.team_id === teamId)
    .sort((a, b) => (a.shirt_number ?? 99) - (b.shirt_number ?? 99));

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["championship", id] });

  function openNewPlayer() {
    setEditingId(null);
    setName("");
    setPosition("MEI");
    setShirt("");
    setPlayerOpen(true);
  }

  function openEditPlayer(p: { id: string; name: string; position: string; shirt_number: number | null }) {
    setEditingId(p.id);
    setName(p.name);
    setPosition(p.position);
    setShirt(p.shirt_number != null ? String(p.shirt_number) : "");
    setPlayerOpen(true);
  }

  function openEditTeam() {
    if (!team) return;
    setTName(team.name);
    setTShort(team.short_name ?? "");
    setTColor(team.color);
    setTCrest(team.crest_url ?? "");
    setTeamOpen(true);
  }

  const savePlayer = useMutation({
    mutationFn: async () => {
      const values = {
        name: name.trim(),
        position,
        shirt_number: shirt ? Number(shirt) : null,
      };
      const { error } = editingId
        ? await supabase.from("players").update(values).eq("id", editingId)
        : await supabase.from("players").insert({ ...values, championship_id: id, team_id: teamId });
      if (error) throw error;
    },
    onSuccess: () => {
      setPlayerOpen(false);
      refresh();
    },
    onError: () => toast.error("Não foi possível salvar o jogador."),
  });

  const removePlayer = useMutation({
    mutationFn: async (playerId: string) => {
      const { error } = await supabase.from("players").delete().eq("id", playerId);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: () => toast.error("Não foi possível remover o jogador."),
  });

  const saveTeam = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("teams")
        .update({
          name: tName.trim(),
          short_name: tShort.trim() || tName.trim().slice(0, 3).toUpperCase(),
          color: tColor,
          crest_url: tCrest.trim() || null,
        })
        .eq("id", teamId);
      if (error) throw error;
    },
    onSuccess: () => {
      setTeamOpen(false);
      refresh();
    },
    onError: () => toast.error("Não foi possível salvar o time."),
  });

  const deleteTeam = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("teams").delete().eq("id", teamId);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Time excluído.");
      await refresh();
      navigate({ to: "/c/$id/times", params: { id } });
    },
    onError: () => toast.error("Não foi possível excluir o time."),
  });

  if (!team) return <p className="px-5 py-8 text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-2">
      <div className="flex items-center gap-3 rounded-2xl bg-card p-4">
        <TeamCrest team={team} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">{team.name}</p>
          <p className="text-xs text-muted-foreground">{squad.length} atletas</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Editar time" onClick={openEditTeam}>
          <Pencil className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Excluir time" onClick={() => setConfirmTeam(true)}>
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>

      <Button className="mt-4 h-12 w-full gap-2 font-semibold" onClick={openNewPlayer}>
        <Plus className="size-5" /> Novo jogador
      </Button>

      <div className="mt-4 space-y-2">
        {squad.length === 0 && (
          <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
            Nenhum jogador cadastrado.
          </p>
        )}
        {squad.map((p) => {
          const s = stats?.get(p.id);
          const suspended = (s?.suspendedMatches ?? 0) > 0;
          return (
            <div key={p.id} className="flex items-center gap-2 rounded-2xl bg-card p-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-sm font-bold">
                {p.shirt_number ?? "–"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium">{p.name}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      suspended ? "bg-destructive/20 text-destructive" : "bg-primary/15 text-primary"
                    }`}
                  >
                    {suspended ? "🔴 Suspenso" : "🟢 Liberado"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {p.position} · {s?.goals ?? 0} gols · {s?.assists ?? 0} assist. · {s?.yellow ?? 0}🟨 ·{" "}
                  {s?.red ?? 0}🟥 · {s?.yellowStreak ?? 0}/3 amarelos
                </p>
              </div>
              <Button variant="ghost" size="icon" aria-label={`Editar ${p.name}`} onClick={() => openEditPlayer(p)}>
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remover ${p.name}`}
                onClick={() => setToRemove({ id: p.id, name: p.name })}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          );
        })}
      </div>

      <Dialog open={playerOpen} onOpenChange={setPlayerOpen}>
        <DialogContent className="max-w-[92vw] rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar jogador" : "Novo jogador"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="player-name">Nome</Label>
              <Input id="player-name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} className="h-12" />
            </div>
            <div className="space-y-2">
              <Label>Posição</Label>
              <div className="flex flex-wrap gap-2">
                {POSITIONS.map((p) => (
                  <Button key={p} type="button" size="sm" variant={position === p ? "default" : "outline"} onClick={() => setPosition(p)}>
                    {p}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="player-shirt">Número da camisa</Label>
              <Input
                id="player-shirt"
                inputMode="numeric"
                value={shirt}
                onChange={(e) => setShirt(e.target.value.replace(/\D/g, "").slice(0, 2))}
                className="h-12"
              />
            </div>
            <Button className="h-12 w-full font-semibold" disabled={!name.trim() || savePlayer.isPending} onClick={() => savePlayer.mutate()}>
              {editingId ? "Salvar alterações" : "Salvar jogador"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={teamOpen} onOpenChange={setTeamOpen}>
        <DialogContent className="max-w-[92vw] rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar time</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Nome</Label>
              <Input id="team-name" value={tName} maxLength={40} onChange={(e) => setTName(e.target.value)} className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-short">Sigla</Label>
              <Input id="team-short" value={tShort} maxLength={5} onChange={(e) => setTShort(e.target.value.toUpperCase())} className="h-12" />
            </div>
            <div className="space-y-2">
              <Label>Cor principal</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Cor ${c}`}
                    onClick={() => setTColor(c)}
                    className={`size-9 rounded-full border-2 ${tColor === c ? "border-primary" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-crest">Link do escudo (opcional)</Label>
              <Input id="team-crest" inputMode="url" className="h-12" placeholder="https://..." value={tCrest} onChange={(e) => setTCrest(e.target.value)} />
            </div>
            <Button className="h-12 w-full font-semibold" disabled={!tName.trim() || saveTeam.isPending} onClick={() => saveTeam.mutate()}>
              Salvar alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toRemove}
        onOpenChange={(o) => {
          if (!o) setToRemove(null);
        }}
        title="Remover jogador?"
        description={`${toRemove?.name ?? ""} sai do elenco. Os cartões dele são apagados e os gols marcados ficam sem autor.`}
        confirmLabel="Remover"
        onConfirm={() => {
          if (toRemove) removePlayer.mutate(toRemove.id);
          setToRemove(null);
        }}
      />

      <ConfirmDialog
        open={confirmTeam}
        onOpenChange={setConfirmTeam}
        title="Excluir time?"
        description={`${team.name}, o elenco e todas as partidas dele serão apagados, e a tabela muda. Não dá para desfazer.`}
        confirmLabel="Excluir time"
        onConfirm={() => {
          setConfirmTeam(false);
          deleteTeam.mutate();
        }}
      />
    </div>
  );
}
