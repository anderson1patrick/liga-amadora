import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { championshipQuery } from "@/lib/champ-data";
import { computeStandings } from "@/lib/standings";
import { StandingsTable } from "@/components/StandingsTable";

export const Route = createFileRoute("/_authenticated/c/$id/tabela")({
  head: () => ({
    meta: [
      { title: "Classificação — Liga Amadora" },
      { name: "description", content: "Tabela com os critérios de desempate do Brasileirão." },
      { property: "og:title", content: "Classificação — Liga Amadora" },
      {
        property: "og:description",
        content: "Tabela com os critérios de desempate do Brasileirão.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TablePage,
});

function TablePage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery(championshipQuery(id));

  const rows = useMemo(() => {
    if (!data) return [];
    return computeStandings(data.teams, data.matches, data.cards);
  }, [data]);

  if (isLoading) {
    return <p className="px-5 py-8 text-sm text-muted-foreground">Carregando…</p>;
  }

  if (rows.length === 0) {
    return (
      <p className="mx-5 mt-8 rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
        Cadastre os times na aba Times para ver a classificação.
      </p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-3 pt-2">
      <StandingsTable rows={rows} />

      <div className="mt-4 rounded-2xl bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Aproveitamento
        </p>
        <div className="mt-3 space-y-2">
          {rows.map((r) => (
            <div key={r.team.id} className="flex items-center gap-3 text-xs">
              <span className="w-24 truncate">{r.team.short_name || r.team.name}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${r.pct}%` }}
                />
              </span>
              <span className="w-12 text-right tabular-nums text-muted-foreground">{r.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 px-1 text-xs leading-relaxed text-muted-foreground">
        Desempate: vitórias, saldo de gols, gols pró, confronto direto (dois times), menos cartões
        vermelhos, menos amarelos e sorteio.
      </p>
    </div>
  );
}
