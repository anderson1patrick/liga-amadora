// Calendário do campeonato: cálculo de rodadas, folgas e datas.
// Datas sempre como texto "AAAA-MM-DD" (sem fuso horário).

export const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

const DAY = 86_400_000;

function parse(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y!, (m ?? 1) - 1, d ?? 1);
}

function toISO(ms: number) {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

export function todayISO() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(iso: string, days: number) {
  return toISO(parse(iso) + days * DAY);
}

export function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function weekdayOf(iso: string) {
  return WEEKDAYS[new Date(parse(iso)).getUTCDay()]!;
}

const valid = (iso: string) => /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(parse(iso));

// Dias em que há jogo: todos os dias entre início e fim que caem nos dias da semana escolhidos.
export function gameDays(start: string, end: string, weekdays: number[], from?: string) {
  if (!valid(start) || !valid(end)) return [];
  const first = from && from > start ? from : start;
  const out: string[] = [];
  for (let t = parse(first); t <= parse(end); t += DAY) {
    if (weekdays.includes(new Date(t).getUTCDay())) out.push(toISO(t));
  }
  return out;
}

// Método do círculo: todos enfrentam todos. Com número ímpar, um time folga em cada rodada.
export function roundPairings(teamIds: string[], r: number) {
  const ids: (string | null)[] = [...teamIds];
  if (ids.length % 2 === 1) ids.push(null);
  const m = ids.length;
  const rest = ids.slice(1);
  const shift = r % (m - 1);
  const rotated = rest.map((_, i) => rest[(i - shift + (m - 1)) % (m - 1)]!);
  const arr = [ids[0]!, ...rotated];
  const pairs: { home: string; away: string }[] = [];
  let bye: string | null = null;
  for (let i = 0; i < m / 2; i++) {
    const a = arr[i] ?? null;
    const b = arr[m - 1 - i] ?? null;
    if (a === null || b === null) {
      bye = a ?? b;
      continue;
    }
    // Alternância que deixa o mando de campo quase igual para todos os times.
    const swap = i === 0 ? r % 2 === 1 : i % 2 === 1;
    pairs.push(swap ? { home: b, away: a } : { home: a, away: b });
  }
  return { pairs, bye };
}

export type PlanInput = {
  teamIds: string[];
  start: string;
  end: string;
  weekdays: number[];
  fromDate?: string | undefined; // ao alterar um campeonato em andamento
  keptRounds?: Set<number> | undefined; // rodadas já disputadas (índice global), que não mudam
};

export type Plan = {
  ok: boolean;
  error?: string;
  roundsPerTurn: number;
  matchesPerRound: number;
  days: number;
  turns: number;
  totalRounds: number;
  kept: number;
  pending: number;
  lastDate: string | null;
  leftover: number;
  matches: { round: number; leg: number; home: string; away: string; date: string }[];
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function planSchedule(input: PlanInput): Plan {
  const n = input.teamIds.length;
  const R = n % 2 === 1 ? n : n - 1;
  const base: Plan = {
    ok: false,
    roundsPerTurn: Math.max(R, 0),
    matchesPerRound: Math.floor(n / 2),
    days: 0,
    turns: 0,
    totalRounds: 0,
    kept: input.keptRounds?.size ?? 0,
    pending: 0,
    lastDate: null,
    leftover: 0,
    matches: [],
  };
  const fail = (error: string, extra: Partial<Plan> = {}): Plan => ({ ...base, ...extra, error });

  if (n < 2) return fail("Cadastre pelo menos 2 times para gerar o calendário.");
  if (input.weekdays.length === 0) return fail("Escolha pelo menos um dia da semana.");
  if (!valid(input.start) || !valid(input.end)) return fail("Informe a data de início e a de fim.");
  if (input.end < input.start) return fail("A data de fim vem antes da data de início.");

  const days = gameDays(input.start, input.end, input.weekdays, input.fromDate);
  const kept = input.keptRounds ?? new Set<number>();
  const K = kept.size;
  const maxKept = K ? Math.max(...kept) + 1 : 0;
  const minTotal = Math.max(Math.ceil(maxKept / R) * R, R);
  const total = Math.floor((K + days.length) / R) * R;

  if (total < minTotal) {
    const missing = minTotal - K - days.length;
    return fail(
      `Falta${missing === 1 ? "" : "m"} ${plural(missing, "dia", "dias")} de jogo para ${
        K ? "terminar o turno atual" : "um turno completo"
      }. Aumente o período ou escolha mais dias da semana.`,
      { days: days.length },
    );
  }

  const matches: Plan["matches"] = [];
  let used = 0;
  let lastDate: string | null = null;
  for (let k = 0; k < total; k++) {
    if (kept.has(k)) continue;
    const date = days[used++]!;
    lastDate = date;
    const turn = Math.floor(k / R) + 1;
    const r = k % R;
    for (const p of roundPairings(input.teamIds, r).pairs) {
      matches.push({
        round: r + 1,
        leg: turn,
        home: turn % 2 === 0 ? p.away : p.home,
        away: turn % 2 === 0 ? p.home : p.away,
        date,
      });
    }
  }

  return {
    ok: true,
    roundsPerTurn: R,
    matchesPerRound: Math.floor(n / 2),
    days: days.length,
    turns: total / R,
    totalRounds: total,
    kept: K,
    pending: total - K,
    lastDate,
    leftover: days.length - used,
    matches,
  };
}
