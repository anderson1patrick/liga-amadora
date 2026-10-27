import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CheckCircle2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { championshipQuery, computePlayerStats, recomputeSuspensions } from "@/lib/champ-data";
import { TeamCrest } from "@/components/TeamCrest";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/c/$id/partida/$matchId")({
  head: () => ({
    meta: [
      { title: "Súmula — Liga Amadora" },
      { name: "description", content: "Gols, assistências e cartões da partida." },
      { property: "og:title", content: "Súmula — Liga Amadora" },
      { property: "og:description", content: "Gols, assistências e cartões da partida." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MatchSheet,
});

function Chip({
  label,
  count,
  disabled,
  onClick,
  children,
}: {
  label: string;
  count: number;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex min-w-[3.4rem] items-center justify-center gap-1.5 rounded-full bg-background px-3 py-2.5 text-sm transition-transform active:scale-95 disabled:opacity-40"
    >
      {children}
      <span className="font-medium tabular-nums">{count}</span>
    </button>
  );
}

function MatchSheet() {
  const { id, matchId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useQuery(championshipQuery(id));

  const [side, setSide] = useState<"home" | "away">("home");
  const [manual, setManual] = useState({ h: "", a: "" });

  const match = data?.matches.find((m) => m.id === matchId);
  const home = data?.teams.find((t) => t.id === match?.home_team_id);
  const away = data?.teams.find((t) => t.id === match?.away_team_id);
  const stats = data ? computePlayerStats(data) : null;

  const matchGoals = (data?.goals ?? []).filter((g) => g.match_id === matchId);
  const matchCards = (data?.cards ?? []).filter((c) => c.match_id === matchId);

  const score = useMemo(() => {
    let h = 0;
    let a = 0;
    for (const g of matchGoals) {
      const creditHome = g.own_goal ? g.team_id !== match?.home_team_id : g.team_id === match?.home_team_id;
      if (creditHome) h++;
      else a++;
    }
    return { h, a };
  }, [matchGoals, match?.home_team_id]);

  const squadOf = (teamId: string) =>
    (data?.players ?? [])
      .filter((p) => p.team_id === teamId)
      .sort((x, y) => (x.shirt_number ?? 999) - (y.shirt_number ?? 999));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["championship", id] });

  const addGoal = useMutation({
    mutationFn: async (args: { teamId: string; playerId: string | null; own: boolean }) => {
      const { error } = await supabase.from("goals").insert({
        championship_id: id,
        match_id: matchId,
        team_id: args.teamId,
        player_id: args.playerId,
        own_goal: args.own,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: () => toast.error("Não foi possível registrar o gol."),
  });

  const addCard = useMutation({
    mutationFn: async (args: { teamId: string; playerId: string; type: "yellow" | "red" }) => {
      const { error } = await supabase.from("cards").insert({
        championship_id: id,
        match_id: matchId,
        team_id: args.teamId,
        player_id: args.playerId,
        card_type: args.type,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: () => toast.error("Não foi possível registrar o cartão."),
  });

  const setAssist = useMutation({
    mutationFn: async (args: { goalId: string; assistId: string | null }) => {
      const { error } = await supabase
        .from("goals")
        .update({ assist_player_id: args.assistId })
        .eq("id", args.goalId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: () => toast.error("Não foi possível salvar a assistência."),
  });

  const removeGoal = useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase.from("goals").delete().eq("id", goalId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const removeCard = useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase.from("cards").delete().eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const finish = useMutation({
    mutationFn: async () => {
      const h = manual.h !== "" ? Number(manual.h) : score.h;
      const a = manual.a !== "" ? Number(manual.a) : score.a;
      const { error } = await supabase
        .from("matches")
        .update({
          status: "finished",
          home_goals: h,
          away_goals: a,
          played_at: new Date().toISOString(),
        })
        .eq("id", matchId);
      if (error) throw error;
      await recomputeSuspensions(id);
    },
    onSuccess: () => {
      toast.success("Partida encerrada. Tabela e estatísticas atualizadas.");
      invalidate();
      navigate({ to: "/c/$id/tabela", params: { id } });
    },
    onError: () => toast.error("Não foi possível encerrar a partida."),
  });

  const reopen = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("matches")
        .update({ status: "scheduled" })
        .eq("id", matchId);
      if (error) throw error;
      await recomputeSuspensions(id);
    },
    onSuccess: invalidate,
  });

  if (!match || !home || !away) {
    return <p className="px-5 py-8 text-sm text-muted-foreground">Carregando…</p>;
  }

  const finished = match.status === "finished";
  const team = side === "home" ? home : away;
  const squad = squadOf(team.id);
  const playerName = (pid: string | null) =>
    data?.players.find((p) => p.id === pid)?.name ?? "Desconhecido";
  const suspended = (pid: string) => (stats?.get(pid)?.suspendedMatches ?? 0) > 0;
  const goalsOf = (pid: string) => matchGoals.filter((g) => g.player_id === pid && !g.own_goal).length;
  const cardsOf = (pid: string, type: string) =>
    matchCards.filter((c) => c.player_id === pid && c.card_type === type).length;

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 rounded-2xl bg-card p-4">
        <div className="flex min-w-0 flex-col items-center gap-2">
          <TeamCrest team={home} size={44} />
          <span className="truncate text-xs font-medium">{home.short_name || home.name}</span>
        </div>
        <span className="text-4xl font-bold tabular-nums text-primary">
          {score.h}
          <span className="px-1 text-muted-foreground">×</span>
          {score.a}
        </span>
        <div className="flex min-w-0 flex-col items-center gap-2">
          <TeamCrest team={away} size={44} />
          <span className="truncate text-xs font-medium">{away.short_name || away.name}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 rounded-full bg-card p-1 text-center text-sm">
        {([["home", home], ["away", away]] as const).map(([key, t]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSide(key)}
            className={`truncate rounded-full px-3 py-2.5 font-medium ${
              side === key ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {t.short_name || t.name}
          </button>
        ))}
      </div>

      <section className="mt-3">
        {squad.length === 0 ? (
          <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
            Este time ainda não tem jogadores. Cadastre o elenco na aba Times.
          </p>
        ) : (
          <div className="space-y-2">
            {squad.map((p) => {
              const sus = suspended(p.id);
              const off = finished || sus;
              return (
                <div key={p.id} className="flex items-center gap-2 rounded-2xl bg-card px-3 py-2.5">
                  <span className="w-6 text-center text-sm font-medium text-muted-foreground">
                    {p.shirt_number ?? "–"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{p.name}</p>
                    <p className={`text-xs ${sus ? "text-destructive" : "text-muted-foreground"}`}>
                      {p.position}
                      {sus && " · suspenso"}
                    </p>
                  </div>
                  <Chip
                    label={`Gol de ${p.name}`}
                    count={goalsOf(p.id)}
                    disabled={off}
                    onClick={() => addGoal.mutate({ teamId: team.id, playerId: p.id, own: false })}
                  >
                    ⚽
                  </Chip>
                  <Chip
                    label={`Cartão amarelo para ${p.name}`}
                    count={cardsOf(p.id, "yellow")}
                    disabled={off}
                    onClick={() => addCard.mutate({ teamId: team.id, playerId: p.id, type: "yellow" })}
                  >
                    🟨
                  </Chip>
                  <Chip
                    label={`Cartão vermelho para ${p.name}`}
                    count={cardsOf(p.id, "red")}
                    disabled={off}
                    onClick={() => addCard.mutate({ teamId: team.id, playerId: p.id, type: "red" })}
                  >
                    🟥
                  </Chip>
                </div>
              );
            })}
          </div>
        )}

        <Button
          variant="outline"
          className="mt-3 h-12 w-full"
          disabled={finished || addGoal.isPending}
          onClick={() => addGoal.mutate({ teamId: team.id, playerId: null, own: true })}
        >
          ⚽ Gol contra de {team.short_name || team.name}
        </Button>
        <p className="mt-1 px-1 text-xs text-muted-foreground">
          O gol contra conta para o time adversário.
        </p>
      </section>

      {(matchGoals.length > 0 || matchCards.length > 0) && (
        <section className="mt-4 rounded-2xl bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Lançamentos
          </h2>
          <div className="mt-3 space-y-2">
            {matchGoals.map((g) => (
              <div key={g.id} className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm">
                  ⚽ {g.own_goal ? "Gol contra" : playerName(g.player_id)}
                </span>
                {!g.own_goal && (
                  <select
                    aria-label="Assistência"
                    disabled={finished}
                    value={g.assist_player_id ?? ""}
                    onChange={(e) => setAssist.mutate({ goalId: g.id, assistId: e.target.value || null })}
                    className="h-9 max-w-[7.5rem] rounded-md border border-border bg-background px-1 text-xs"
                  >
                    <option value="">Sem assist.</option>
                    {squadOf(g.team_id)
                      .filter((p) => p.id !== g.player_id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remover gol"
                  disabled={finished}
                  onClick={() => removeGoal.mutate(g.id)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
            {matchCards.map((c) => (
              <div key={c.id} className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm">
                  {c.card_type === "yellow" ? "🟨" : "🟥"} {playerName(c.player_id)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remover cartão"
                  disabled={finished}
                  onClick={() => removeCard.mutate(c.id)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {!finished && (
        <section className="mt-4 rounded-2xl bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Placar final
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Não sabe quem fez os gols? Digite só o placar. Em branco, vale a soma dos gols lançados.
          </p>
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <Input
              inputMode="numeric"
              aria-label={`Gols de ${home.name}`}
              className="h-12 text-center text-lg"
              placeholder={String(score.h)}
              value={manual.h}
              onChange={(e) => setManual({ ...manual, h: e.target.value.replace(/\D/g, "").slice(0, 2) })}
            />
            <span className="text-muted-foreground">×</span>
            <Input
              inputMode="numeric"
              aria-label={`Gols de ${away.name}`}
              className="h-12 text-center text-lg"
              placeholder={String(score.a)}
              value={manual.a}
              onChange={(e) => setManual({ ...manual, a: e.target.value.replace(/\D/g, "").slice(0, 2) })}
            />
          </div>
        </section>
      )}

      <div className="mt-4 mb-4">
        {finished ? (
          <Button
            variant="outline"
            className="h-12 w-full font-semibold"
            disabled={reopen.isPending}
            onClick={() => reopen.mutate()}
          >
            Reabrir súmula
          </Button>
        ) : (
          <Button
            className="h-14 w-full gap-2 rounded-full text-base font-semibold"
            disabled={finish.isPending}
            onClick={() => finish.mutate()}
          >
            <CheckCircle2 className="size-5" /> Encerrar partida
          </Button>
        )}
      </div>
    </div>
  );
}
