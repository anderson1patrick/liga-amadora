export interface TeamLike {
  id: string;
  name: string;
  short_name: string | null;
  color: string;
  crest_url: string | null;
}

export interface MatchLike {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_goals: number;
  away_goals: number;
  status: string;
}

export interface CardLike {
  team_id: string;
  card_type: string;
  match_id?: string;
}

export interface TeamStats {
  team: TeamLike;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  yellow: number;
  red: number;
  pct: number;
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000003;
  return h;
}

/**
 * Ordenação idêntica ao Brasileirão Série A:
 * pontos > vitórias > saldo de gols > gols pró > confronto direto (só com 2 times)
 * > menos vermelhos > menos amarelos > sorteio (estável).
 */
export function computeStandings(
  teams: TeamLike[],
  matches: MatchLike[],
  cards: CardLike[],
): TeamStats[] {
  const finished = matches.filter((m) => m.status === "finished");
  const stats = new Map<string, TeamStats>();

  for (const team of teams) {
    stats.set(team.id, {
      team,
      points: 0,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      yellow: 0,
      red: 0,
      pct: 0,
    });
  }

  for (const m of finished) {
    const home = stats.get(m.home_team_id);
    const away = stats.get(m.away_team_id);
    if (!home || !away) continue;
    home.played++;
    away.played++;
    home.goalsFor += m.home_goals;
    home.goalsAgainst += m.away_goals;
    away.goalsFor += m.away_goals;
    away.goalsAgainst += m.home_goals;
    if (m.home_goals > m.away_goals) {
      home.wins++;
      home.points += 3;
      away.losses++;
    } else if (m.home_goals < m.away_goals) {
      away.wins++;
      away.points += 3;
      home.losses++;
    } else {
      home.draws++;
      away.draws++;
      home.points += 1;
      away.points += 1;
    }
  }

  const finishedIds = new Set(finished.map((m) => m.id));
  for (const c of cards) {
    if (c.match_id && !finishedIds.has(c.match_id)) continue;
    const s = stats.get(c.team_id);
    if (!s) continue;
    if (c.card_type === "yellow") s.yellow++;
    else s.red++;
  }

  for (const s of stats.values()) {
    s.goalDiff = s.goalsFor - s.goalsAgainst;
    s.pct = s.played > 0 ? Math.round((s.points / (s.played * 3)) * 1000) / 10 : 0;
  }

  const list = [...stats.values()];

  const primary = (a: TeamStats, b: TeamStats) =>
    b.points - a.points ||
    b.wins - a.wins ||
    b.goalDiff - a.goalDiff ||
    b.goalsFor - a.goalsFor;

  const sameKey = (a: TeamStats, b: TeamStats) => primary(a, b) === 0;

  const fallback = (a: TeamStats, b: TeamStats) =>
    a.red - b.red || a.yellow - b.yellow || hashId(a.team.id) - hashId(b.team.id);

  const headToHead = (a: TeamStats, b: TeamStats) => {
    let aPts = 0;
    let bPts = 0;
    let aGoals = 0;
    let bGoals = 0;
    for (const m of finished) {
      const isPair =
        (m.home_team_id === a.team.id && m.away_team_id === b.team.id) ||
        (m.home_team_id === b.team.id && m.away_team_id === a.team.id);
      if (!isPair) continue;
      const aIsHome = m.home_team_id === a.team.id;
      const ag = aIsHome ? m.home_goals : m.away_goals;
      const bg = aIsHome ? m.away_goals : m.home_goals;
      aGoals += ag;
      bGoals += bg;
      if (ag > bg) aPts += 3;
      else if (ag < bg) bPts += 3;
      else {
        aPts += 1;
        bPts += 1;
      }
    }
    return bPts - aPts || bGoals - aGoals;
  };

  list.sort(primary);

  // resolve empates dentro de cada bloco com chave primária idêntica
  const result: TeamStats[] = [];
  let i = 0;
  while (i < list.length) {
    let j = i + 1;
    while (j < list.length && sameKey(list[i]!, list[j]!)) j++;
    const group = list.slice(i, j);
    if (group.length === 2) {
      group.sort((a, b) => headToHead(a, b) || fallback(a, b));
    } else if (group.length > 2) {
      group.sort(fallback);
    }
    result.push(...group);
    i = j;
  }

  return result;
}

export interface FixtureItem {
  round: number;
  leg: number;
  home: string;
  away: string;
}

/** Gera as rodadas (sistema de rodízio) para turno único ou turno e returno. */
export function generateFixtures(teamIds: string[], double: boolean): FixtureItem[] {
  const ids: (string | null)[] = [...teamIds];
  if (ids.length < 2) return [];
  if (ids.length % 2 !== 0) ids.push(null);

  const n = ids.length;
  const roundsCount = n - 1;
  const half = n / 2;
  let arr = [...ids];
  const first: FixtureItem[] = [];

  for (let r = 0; r < roundsCount; r++) {
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (!a || !b) continue;
      const swap = r % 2 === 1;
      first.push({
        round: r + 1,
        leg: 1,
        home: swap ? b : a,
        away: swap ? a : b,
      });
    }
    arr = [arr[0]!, arr[n - 1]!, ...arr.slice(1, n - 1)];
  }

  if (!double) return first;

  const second = first.map((f) => ({
    round: f.round + roundsCount,
    leg: 2,
    home: f.away,
    away: f.home,
  }));

  return [...first, ...second];
}
