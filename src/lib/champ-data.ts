import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Championship = Tables<"championships">;
export type Team = Tables<"teams">;
export type Player = Tables<"players">;
export type Match = Tables<"matches">;
export type Goal = Tables<"goals">;
export type CardRow = Tables<"cards">;
export type Suspension = Tables<"suspensions">;

export const POSITIONS = ["GOL", "ZAG", "LAT", "VOL", "MEI", "ATA"] as const;

export const championshipsQuery = () =>
  queryOptions({
    queryKey: ["championships"],
    queryFn: async (): Promise<Championship[]> => {
      const { data, error } = await supabase
        .from("championships")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export interface ChampionshipBundle {
  championship: Championship;
  teams: Team[];
  players: Player[];
  matches: Match[];
  goals: Goal[];
  cards: CardRow[];
  suspensions: Suspension[];
}

export const championshipQuery = (id: string) =>
  queryOptions({
    queryKey: ["championship", id],
    queryFn: async (): Promise<ChampionshipBundle> => {
      const [champ, teams, players, matches, goals, cards, suspensions] = await Promise.all([
        supabase.from("championships").select("*").eq("id", id).maybeSingle(),
        supabase.from("teams").select("*").eq("championship_id", id).order("name"),
        supabase.from("players").select("*").eq("championship_id", id).order("name"),
        supabase
          .from("matches")
          .select("*")
          .eq("championship_id", id)
          .order("leg")
          .order("round")
          .order("created_at"),
        supabase.from("goals").select("*").eq("championship_id", id),
        supabase.from("cards").select("*").eq("championship_id", id),
        supabase.from("suspensions").select("*").eq("championship_id", id),
      ]);

      const firstError =
        champ.error ??
        teams.error ??
        players.error ??
        matches.error ??
        goals.error ??
        cards.error ??
        suspensions.error;
      if (firstError) throw firstError;
      if (!champ.data) throw new Error("Campeonato não encontrado");

      return {
        championship: champ.data,
        teams: teams.data ?? [],
        players: players.data ?? [],
        matches: matches.data ?? [],
        goals: goals.data ?? [],
        cards: cards.data ?? [],
        suspensions: suspensions.data ?? [],
      };
    },
  });

export interface PlayerStats {
  player: Player;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  suspendedMatches: number;
  yellowStreak: number;
}

export function computePlayerStats(bundle: ChampionshipBundle): Map<string, PlayerStats> {
  const map = new Map<string, PlayerStats>();
  for (const player of bundle.players) {
    map.set(player.id, {
      player,
      goals: 0,
      assists: 0,
      yellow: 0,
      red: 0,
      suspendedMatches: 0,
      yellowStreak: 0,
    });
  }
  const done = new Set(bundle.matches.filter((m) => m.status === "finished").map((m) => m.id));
  for (const g of bundle.goals) {
    if (!done.has(g.match_id)) continue;
    if (g.player_id && !g.own_goal) {
      const s = map.get(g.player_id);
      if (s) s.goals++;
    }
    if (g.assist_player_id) {
      const s = map.get(g.assist_player_id);
      if (s) s.assists++;
    }
  }
  for (const c of bundle.cards) {
    if (!done.has(c.match_id)) continue;
    const s = map.get(c.player_id);
    if (!s) continue;
    if (c.card_type === "yellow") s.yellow++;
    else s.red++;
  }
  for (const s of map.values()) s.yellowStreak = s.yellow % 3;
  for (const susp of bundle.suspensions) {
    const s = map.get(susp.player_id);
    if (s) s.suspendedMatches += susp.matches_remaining;
  }
  return map;
}

export async function recomputeSuspensions(championshipId: string) {
  const { error } = await supabase.rpc("recompute_suspensions", {
    _championship_id: championshipId,
  });
  if (error) throw error;
}
