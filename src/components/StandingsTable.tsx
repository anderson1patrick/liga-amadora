import { TeamCrest } from "@/components/TeamCrest";
import type { TeamStats } from "@/lib/standings";

function zoneColor(index: number, total: number) {
  if (index === 0) return "bg-champion";
  if (index < 4) return "bg-libertadores";
  if (total > 8 && index >= total - 2) return "bg-relegation";
  return "bg-transparent";
}

const STAT_GRID = "grid grid-cols-[repeat(9,1.75rem)_2.75rem] items-center";

export function StandingsTable({ rows }: { rows: TeamStats[] }) {
  const total = rows.length;

  return (
    <div>
      <div className="flex overflow-hidden rounded-2xl bg-card">
        {/* Coluna fixa: posição + time */}
        <div className="w-[8.5rem] shrink-0 border-r border-border">
          <div className="flex h-9 items-center border-b border-border pl-3 text-xs font-semibold uppercase text-muted-foreground">
            # Time
          </div>
          {rows.map((r, i) => (
            <div
              key={r.team.id}
              className="relative flex h-11 items-center gap-2 border-b border-border/50 pl-3 pr-1 text-xs last:border-0"
            >
              <span className={`absolute inset-y-0 left-0 w-1 ${zoneColor(i, total)}`} aria-hidden />
              <span className="w-4 text-center text-muted-foreground">{i + 1}</span>
              <TeamCrest team={r.team} size={22} />
              <span className="min-w-0 truncate font-medium">{r.team.short_name || r.team.name}</span>
            </div>
          ))}
        </div>

        {/* Estatísticas: rolam para o lado */}
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="w-max">
            <div
              className={`${STAT_GRID} h-9 border-b border-border text-center text-xs font-semibold uppercase text-muted-foreground`}
            >
              <span className="text-primary">P</span>
              <span>J</span>
              <span>V</span>
              <span>E</span>
              <span>D</span>
              <span>GP</span>
              <span>GC</span>
              <span>SG</span>
              <span>%</span>
            </div>
            {rows.map((r) => (
              <div
                key={r.team.id}
                className={`${STAT_GRID} h-11 border-b border-border/50 text-center text-xs tabular-nums last:border-0`}
              >
                <span className="font-bold text-primary">{r.points}</span>
                <span>{r.played}</span>
                <span>{r.wins}</span>
                <span>{r.draws}</span>
                <span>{r.losses}</span>
                <span>{r.goalsFor}</span>
                <span>{r.goalsAgainst}</span>
                <span>{r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}</span>
                <span>{r.pct}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-2 px-1 text-xs text-muted-foreground">Deslize a tabela para o lado para ver todas as colunas.</p>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-champion" /> Líder
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-libertadores" /> Vagas (G4)
        </span>
        {total > 8 && (
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-relegation" /> Rebaixamento
          </span>
        )}
      </div>
    </div>
  );
}
