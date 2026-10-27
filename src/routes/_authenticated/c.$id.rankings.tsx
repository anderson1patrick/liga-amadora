import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { championshipQuery, computePlayerStats, type PlayerStats } from "@/lib/champ-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/c/$id/rankings")({
  head: () => ({
    meta: [
      { title: "Rankings — Liga Amadora" },
      { name: "description", content: "Artilharia, assistências e cartões do campeonato." },
      { property: "og:title", content: "Rankings — Liga Amadora" },
      { property: "og:description", content: "Artilharia, assistências e cartões do campeonato." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RankingsPage,
});

function RankingsPage() {
  const { id } = Route.useParams();
  const { data } = useQuery(championshipQuery(id));

  const { list, teamName } = useMemo(() => {
    if (!data) return { list: [] as PlayerStats[], teamName: new Map<string, string>() };
    return {
      list: [...computePlayerStats(data).values()],
      teamName: new Map(data.teams.map((t) => [t.id, t.short_name || t.name])),
    };
  }, [data]);

  function Ranking({
    rows,
    value,
    empty,
  }: {
    rows: PlayerStats[];
    value: (s: PlayerStats) => number;
    empty: string;
  }) {
    const filtered = rows.filter((r) => value(r) > 0).sort((a, b) => value(b) - value(a));
    if (filtered.length === 0) {
      return (
        <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">{empty}</p>
      );
    }
    return (
      <div className="overflow-hidden rounded-2xl bg-card">
        {filtered.map((r, i) => (
          <div
            key={r.player.id}
            className="flex items-center gap-3 border-b border-border/50 p-3 last:border-0"
          >
            <span className="w-5 text-center text-xs text-muted-foreground">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.player.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {teamName.get(r.player.team_id) ?? ""} · {r.player.position}
              </p>
            </div>
            <span className="text-lg font-bold text-primary tabular-nums">{value(r)}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-2">
      <Tabs defaultValue="gols">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="gols">Gols</TabsTrigger>
          <TabsTrigger value="assist">Assist.</TabsTrigger>
          <TabsTrigger value="amarelos">🟨</TabsTrigger>
          <TabsTrigger value="vermelhos">🟥</TabsTrigger>
        </TabsList>
        <TabsContent value="gols" className="mt-4">
          <Ranking rows={list} value={(s) => s.goals} empty="Nenhum gol registrado ainda." />
        </TabsContent>
        <TabsContent value="assist" className="mt-4">
          <Ranking
            rows={list}
            value={(s) => s.assists}
            empty="Nenhuma assistência registrada ainda."
          />
        </TabsContent>
        <TabsContent value="amarelos" className="mt-4">
          <Ranking rows={list} value={(s) => s.yellow} empty="Nenhum cartão amarelo aplicado." />
        </TabsContent>
        <TabsContent value="vermelhos" className="mt-4">
          <Ranking rows={list} value={(s) => s.red} empty="Nenhum cartão vermelho aplicado." />
        </TabsContent>
      </Tabs>
    </div>
  );
}
