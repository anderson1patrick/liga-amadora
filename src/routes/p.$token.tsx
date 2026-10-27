import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Eye, ListOrdered, Shirt, Target, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { computePlayerStats, type ChampionshipBundle, type PlayerStats } from "@/lib/champ-data";
import { computeStandings } from "@/lib/standings";
import { TeamCrest } from "@/components/TeamCrest";
import { saveFollowed } from "@/lib/followed";
import { StandingsTable } from "@/components/StandingsTable";

export const Route = createFileRoute("/p/$token")({
  head: () => ({
    meta: [
      { title: "Campeonato — Liga Amadora" },
      { name: "description", content: "Acompanhe a tabela, os jogos e a artilharia." },
      { property: "og:title", content: "Campeonato — Liga Amadora" },
      { property: "og:description", content: "Acompanhe a tabela, os jogos e a artilharia." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PublicChampionship,
});

type Tab = "tabela" | "partidas" | "times" | "artilharia";

const tabs = [
  { key: "tabela", label: "Tabela", icon: Trophy },
  { key: "partidas", label: "Partidas", icon: ListOrdered },
  { key: "times", label: "Times", icon: Shirt },
  { key: "artilharia", label: "Artilharia", icon: Target },
] as const;

function PublicChampionship() {
  const { token } = Route.useParams();
  const [tab, setTab] = useState<Tab>("tabela");

  const { data, isLoading } = useQuery({
    queryKey: ["public-championship", token],
    refetchInterval: 30000,
    queryFn: async (): Promise<ChampionshipBundle | null> => {
      const { data, error } = await supabase.rpc("get_public_championship" as never, {
        _token: token,
      } as never);
      if (error) throw error;
      return (data as unknown as ChampionshipBundle | null) ?? null;
    },
  });

  useEffect(() => {
    if (data?.championship.name) saveFollowed({ token, name: data.championship.name });
  }, [data?.championship.name, token]);

  return (
    <div className="min-h-screen pb-24">
      <header className="pitch-glow sticky top-0 z-20 bg-background/90 px-4 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-1 text-sm font-semibold text-muted-foreground">
            <ChevronLeft className="size-4" /> Liga Amadora
          </Link>
          <span className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-1 text-xs text-primary">
            <Eye className="size-3.5" /> Somente leitura
          </span>
        </div>
        <h1 className="mt-2 truncate text-2xl leading-tight text-foreground">
          {data?.championship.name ?? "Campeonato"}
        </h1>
        {data && (
          <p className="truncate text-xs uppercase tracking-widest text-muted-foreground">
            {data.championship.season ? `${data.championship.season} · ` : ""}
            {data.championship.format === "double" ? "Turno e returno" : "Turno único"}
          </p>
        )}
      </header>

      {isLoading ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">Carregando…</p>
      ) : !data ? (
        <p className="mx-5 mt-8 rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
          Este link não está disponível. Peça um link novo ao organizador do campeonato.
        </p>
      ) : (
        <>
          {tab === "tabela" && <TablePanel data={data} />}
          {tab === "partidas" && <MatchesPanel data={data} />}
          {tab === "times" && <TeamsPanel data={data} />}
          {tab === "artilharia" && <RankingsPanel data={data} />}
        </>
      )}

      <nav className="m3-nav fixed inset-x-0 bottom-0 z-30 border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              data-status={tab === t.key ? "active" : "inactive"}
              className="m3-item"
            >
              <span className="m3-pill">
                <t.icon className="size-5" />
              </span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function TablePanel({ data }: { data: ChampionshipBundle }) {
  const rows = useMemo(
    () => computeStandings(data.teams, data.matches, data.cards),
    [data],
  );

  if (rows.length === 0) {
    return (
      <p className="mx-5 mt-8 rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
        A classificação aparece assim que os times forem cadastrados.
      </p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-3 pt-2">
      <StandingsTable rows={rows} />
      <p className="mt-4 px-1 text-xs leading-relaxed text-muted-foreground">
        Desempate: vitórias, saldo de gols, gols pró, confronto direto (dois times), menos cartões
        vermelhos, menos amarelos e sorteio.
      </p>
    </div>
  );
}

function MatchesPanel({ data }: { data: ChampionshipBundle }) {
  const teamById = useMemo(() => new Map(data.teams.map((t) => [t.id, t])), [data]);
  const groups = useMemo(() => {
    const map = new Map<string, { title: string; items: typeof data.matches }>();
    for (const m of data.matches) {
      const key = `${m.leg}-${m.round}`;
      if (!map.has(key)) {
        map.set(key, {
          title: `${data.championship.format === "double" ? `${m.leg}º turno · ` : ""}Rodada ${m.round}`,
          items: [],
        });
      }
      map.get(key)!.items.push(m);
    }
    return [...map.values()];
  }, [data]);

  if (groups.length === 0) {
    return (
      <p className="mx-5 mt-8 rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
        Os jogos aparecem quando o organizador gerar as rodadas.
      </p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4 px-4 pt-2">
      {groups.map((g) => (
        <section key={g.title}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {g.title}
          </h2>
          <div className="overflow-hidden rounded-2xl bg-card">
            {g.items.map((m) => {
              const h = teamById.get(m.home_team_id);
              const a = teamById.get(m.away_team_id);
              if (!h || !a) return null;
              const done = m.status === "finished";
              return (
                <div
                  key={m.id}
                  className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-border/50 p-3 last:border-0"
                >
                  <span className="flex min-w-0 items-center justify-end gap-2 text-sm">
                    <span className="truncate">{h.short_name || h.name}</span>
                    <TeamCrest team={h} size={24} />
                  </span>
                  <span className="min-w-[3.5rem] rounded-lg bg-muted px-2 py-1 text-center text-sm font-bold tabular-nums">
                    {done ? `${m.home_goals} × ${m.away_goals}` : "×"}
                  </span>
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <TeamCrest team={a} size={24} />
                    <span className="truncate">{a.short_name || a.name}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function TeamsPanel({ data }: { data: ChampionshipBundle }) {
  const stats = useMemo(() => computePlayerStats(data), [data]);
  const [teamId, setTeamId] = useState<string | null>(data.teams[0]?.id ?? null);
  const team = data.teams.find((t) => t.id === teamId) ?? data.teams[0];

  if (!team) {
    return (
      <p className="mx-5 mt-8 rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
        Nenhum time cadastrado ainda.
      </p>
    );
  }

  const players = [...stats.values()]
    .filter((s) => s.player.team_id === team.id)
    .sort((a, b) => (a.player.shirt_number ?? 999) - (b.player.shirt_number ?? 999));

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-2">
      <div className="flex gap-2 overflow-x-auto pb-3">
        {data.teams.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTeamId(t.id)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs ${
              t.id === team.id ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
            }`}
          >
            <TeamCrest team={t} size={18} />
            {t.short_name || t.name}
          </button>
        ))}
      </div>
      {players.length === 0 ? (
        <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
          Elenco ainda não cadastrado.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-card">
          {players.map((s) => {
            const suspended = s.suspendedMatches > 0;
            return (
              <div key={s.player.id} className="flex items-center gap-3 border-b border-border/50 p-3 last:border-0">
                <span className="w-6 text-center text-sm font-bold text-muted-foreground">
                  {s.player.shirt_number ?? "–"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.player.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.player.position} · ⚽ {s.goals} · 🟨 {s.yellow} · 🟥 {s.red}
                  </p>
                </div>
                <span className={`text-xs ${suspended ? "text-destructive" : "text-primary"}`}>
                  {suspended ? "🔴 Suspenso" : "🟢 Liberado"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const rankingTabs: { key: string; label: string; value: (s: PlayerStats) => number; empty: string }[] = [
  { key: "gols", label: "Gols", value: (s) => s.goals, empty: "Nenhum gol registrado ainda." },
  { key: "assist", label: "Assist.", value: (s) => s.assists, empty: "Nenhuma assistência registrada ainda." },
  { key: "amarelos", label: "🟨", value: (s) => s.yellow, empty: "Nenhum cartão amarelo aplicado." },
  { key: "vermelhos", label: "🟥", value: (s) => s.red, empty: "Nenhum cartão vermelho aplicado." },
];

function RankingsPanel({ data }: { data: ChampionshipBundle }) {
  const [key, setKey] = useState("gols");
  const list = useMemo(() => [...computePlayerStats(data).values()], [data]);
  const teamName = useMemo(() => new Map(data.teams.map((t) => [t.id, t.short_name || t.name])), [data]);
  const current = rankingTabs.find((t) => t.key === key) ?? rankingTabs[0];
  const rows = list.filter((r) => current.value(r) > 0).sort((a, b) => current.value(b) - current.value(a));

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-2">
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-card p-1">
        {rankingTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setKey(t.key)}
            className={`rounded-lg py-2 text-xs font-medium ${
              t.key === current.key ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {rows.length === 0 ? (
          <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">{current.empty}</p>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-card">
            {rows.map((r, i) => (
              <div key={r.player.id} className="flex items-center gap-3 border-b border-border/50 p-3 last:border-0">
                <span className="w-5 text-center text-xs text-muted-foreground">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.player.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {teamName.get(r.player.team_id) ?? ""} · {r.player.position}
                  </p>
                </div>
                <span className="text-lg font-bold tabular-nums text-primary">{current.value(r)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
