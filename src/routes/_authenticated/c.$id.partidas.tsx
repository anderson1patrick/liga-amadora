import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarPlus, CalendarCog, RotateCcw } from "lucide-react";
import { championshipQuery, type Match } from "@/lib/champ-data";
import { formatDate, weekdayOf } from "@/lib/schedule";
import { CalendarDialog } from "@/components/CalendarDialog";
import { TeamCrest } from "@/components/TeamCrest";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/_authenticated/c/$id/partidas")({
  head: () => ({
    meta: [
      { title: "Partidas — Liga Amadora" },
      { name: "description", content: "Rodadas do campeonato e lançamento de súmulas." },
      { property: "og:title", content: "Partidas — Liga Amadora" },
      { property: "og:description", content: "Rodadas do campeonato e lançamento de súmulas." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MatchesPage,
});

type DatedMatch = Match & { match_date?: string | null };

function MatchesPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery(championshipQuery(id));
  const [calOpen, setCalOpen] = useState(false);
  const [calMode, setCalMode] = useState<"create" | "edit">("create");
  const [confirmRedo, setConfirmRedo] = useState(false);

  const rounds = useMemo(() => {
    const map = new Map<string, DatedMatch[]>();
    for (const m of (data?.matches ?? []) as DatedMatch[]) {
      const key = `${m.leg}-${m.round}`;
      const list = map.get(key) ?? [];
      list.push(m);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [data]);

  if (isLoading || !data) return <p className="px-5 py-8 text-sm text-muted-foreground">Carregando…</p>;

  const champ = data.championship as typeof data.championship & {
    start_date?: string | null;
    end_date?: string | null;
    weekdays?: number[] | null;
    turns?: number | null;
  };
  const teamById = new Map(data.teams.map((t) => [t.id, t]));
  const hasMatches = data.matches.length > 0;
  const totalTurns = champ.turns ?? Math.max(1, ...data.matches.map((m) => m.leg));
  const oddTeams = data.teams.length % 2 === 1;

  function openCalendar(mode: "create" | "edit") {
    setCalMode(mode);
    setCalOpen(true);
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-2">
      {hasMatches ? (
        <div className="grid grid-cols-2 gap-2">
          <Button className="h-12 gap-2 font-semibold" onClick={() => openCalendar("edit")}>
            <CalendarCog className="size-5" /> Alterar dias
          </Button>
          <Button variant="outline" className="h-12 gap-2 font-semibold" onClick={() => setConfirmRedo(true)}>
            <RotateCcw className="size-5" /> Refazer do zero
          </Button>
        </div>
      ) : (
        <Button className="h-12 w-full gap-2 font-semibold" onClick={() => openCalendar("create")}>
          <CalendarPlus className="size-5" /> Gerar calendário
        </Button>
      )}

      {!hasMatches && (
        <p className="mt-4 rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
          Cadastre os times e gere o calendário para começar.
        </p>
      )}

      <div className="mt-5 space-y-6">
        {rounds.map(([key, matches]) => {
          const first = matches[0]!;
          const date = first.match_date;
          const playing = new Set(matches.flatMap((m) => [m.home_team_id, m.away_team_id]));
          const resting = oddTeams ? data.teams.filter((t) => !playing.has(t.id)) : [];
          return (
            <section key={key}>
              <h2 className="mb-2 flex items-baseline justify-between gap-2 px-1 text-sm uppercase tracking-widest text-muted-foreground">
                <span>
                  {totalTurns > 1 ? `${first.leg}º turno · ` : ""}Rodada {first.round}
                </span>
                {date && (
                  <span className="shrink-0 text-xs normal-case tracking-normal">
                    {weekdayOf(date)}, {formatDate(date).slice(0, 5)}
                  </span>
                )}
              </h2>
              {resting.length > 0 && (
                <p className="mb-2 px-1 text-xs text-muted-foreground">
                  Folga: {resting.map((t) => t.short_name || t.name).join(", ")}
                </p>
              )}
              <div className="space-y-2">
                {matches.map((m) => {
                  const home = teamById.get(m.home_team_id);
                  const away = teamById.get(m.away_team_id);
                  if (!home || !away) return null;
                  return (
                    <Link
                      key={m.id}
                      to="/c/$id/partida/$matchId"
                      params={{ id, matchId: m.id }}
                      className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-2xl bg-card p-3"
                    >
                      <span className="flex min-w-0 items-center justify-end gap-2 text-right">
                        <span className="truncate text-sm font-medium">{home.short_name || home.name}</span>
                        <TeamCrest team={home} size={24} />
                      </span>
                      <span
                        className={`rounded-lg px-2 py-1 text-sm font-bold tabular-nums ${
                          m.status === "finished" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {m.status === "finished" ? `${m.home_goals} × ${m.away_goals}` : "vs"}
                      </span>
                      <span className="flex min-w-0 items-center gap-2">
                        <TeamCrest team={away} size={24} />
                        <span className="truncate text-sm font-medium">{away.short_name || away.name}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <CalendarDialog
        open={calOpen}
        onOpenChange={setCalOpen}
        championshipId={id}
        mode={calMode}
        teamIds={data.teams.map((t) => t.id)}
        matches={data.matches}
        championship={champ}
      />

      <ConfirmDialog
        open={confirmRedo}
        onOpenChange={setConfirmRedo}
        title="Refazer do zero?"
        description="Todos os jogos, gols e cartões já lançados serão apagados e o calendário será gerado de novo. Não dá para desfazer."
        confirmLabel="Continuar"
        onConfirm={() => {
          setConfirmRedo(false);
          openCalendar("create");
        }}
      />
    </div>
  );
}
