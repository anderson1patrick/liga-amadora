import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Shirt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addDays, formatDate, planSchedule, todayISO, weekdayOf, WEEKDAYS } from "@/lib/schedule";

type MatchLike = { id: string; leg: number; round: number; status: string };
type ChampLike = {
  start_date?: string | null;
  end_date?: string | null;
  weekdays?: number[] | null;
  turns?: number | null;
};

export function CalendarDialog({
  open,
  onOpenChange,
  championshipId,
  mode,
  teamIds,
  matches,
  championship,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  championshipId: string;
  mode: "create" | "edit";
  teamIds: string[];
  matches: MatchLike[];
  championship: ChampLike;
}) {
  const queryClient = useQueryClient();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [from, setFrom] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([]);

  useEffect(() => {
    if (!open) return;
    const today = todayISO();
    const s = championship.start_date ?? today;
    setStart(s);
    setEnd(championship.end_date ?? addDays(s, 364));
    setFrom(today > s ? today : s);
    setWeekdays(championship.weekdays ?? []);
  }, [open, championship.start_date, championship.end_date, championship.weekdays]);

  const n = teamIds.length;
  const perTurn = n % 2 === 1 ? n : n - 1;
  const edit = mode === "edit";

  const kept = useMemo(() => {
    const set = new Set<number>();
    if (!edit) return set;
    for (const m of matches) if (m.status === "finished") set.add((m.leg - 1) * perTurn + (m.round - 1));
    return set;
  }, [edit, matches, perTurn]);

  const plan = useMemo(
    () =>
      planSchedule({
        teamIds,
        start,
        end,
        weekdays,
        fromDate: edit ? from : undefined,
        keptRounds: edit ? kept : undefined,
      }),
    [teamIds, start, end, weekdays, edit, from, kept],
  );

  const save = useMutation({
    mutationFn: async () => {
      const deleteIds = edit
        ? matches
            .filter((m) => m.status === "scheduled" && !kept.has((m.leg - 1) * perTurn + (m.round - 1)))
            .map((m) => m.id)
        : [];
      const { error } = await supabase.rpc("apply_schedule" as never, {
        _championship_id: championshipId,
        _start: start,
        _end: end,
        _weekdays: weekdays,
        _turns: plan.turns,
        _reset: !edit,
        _delete_ids: deleteIds,
        _matches: plan.matches,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(edit ? "Calendário recalculado." : "Calendário gerado.");
      queryClient.invalidateQueries({ queryKey: ["championship", championshipId] });
      onOpenChange(false);
    },
    onError: () => toast.error("Não foi possível salvar o calendário. Tente de novo."),
  });

  function toggle(day: number) {
    setWeekdays((cur) => (cur.includes(day) ? cur.filter((d) => d !== day) : [...cur, day].sort()));
  }

  const times = (v: number) => `${v} ${v === 1 ? "vez" : "vezes"}`;
  const previous = championship.turns ?? null;

  const rows: [string, string][] = edit
    ? [
        ["Rodadas já disputadas", `${plan.kept} (ficam como estão)`],
        ["Dias de jogo restantes", String(plan.days)],
        ["Rodadas que faltam", String(plan.pending)],
        ["Último jogo", plan.lastDate ? `${formatDate(plan.lastDate)} (${weekdayOf(plan.lastDate)})` : "—"],
        ["Dias sem jogo no fim", String(plan.leftover)],
      ]
    : [
        [
          "Rodadas por turno",
          `${plan.roundsPerTurn} (${plan.matchesPerRound} ${plan.matchesPerRound === 1 ? "jogo" : "jogos"}${n % 2 === 1 ? ", 1 folga" : ""})`,
        ],
        ["Rodadas no total", String(plan.totalRounds)],
        ["Dias de jogo no período", String(plan.days)],
        ["Último jogo", plan.lastDate ? `${formatDate(plan.lastDate)} (${weekdayOf(plan.lastDate)})` : "—"],
        ["Dias sem jogo no fim", String(plan.leftover)],
      ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-[94vw] overflow-y-auto rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{edit ? "Alterar dias de jogo" : "Gerar calendário"}</DialogTitle>
          <DialogDescription>
            {edit
              ? "Os jogos já disputados não mudam. Só os jogos que faltam são reorganizados."
              : "Escolha o período e os dias da semana. O app calcula o resto."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1.5 text-xs text-primary">
            <Shirt className="size-3.5" /> {n} {n === 1 ? "time cadastrado" : "times cadastrados"}
          </span>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cal-start">Início</Label>
              <Input id="cal-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cal-end">Fim</Label>
              <Input id="cal-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="h-11" />
            </div>
          </div>

          {edit && (
            <div className="space-y-1.5">
              <Label htmlFor="cal-from">Valer a partir de</Label>
              <Input id="cal-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-11" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Dias de jogo (marque quantos quiser)</Label>
            <div className="flex gap-1.5">
              {WEEKDAYS.map((name, d) => {
                const on = weekdays.includes(d);
                return (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(d)}
                    className={`flex-1 rounded-full py-2.5 text-xs font-medium ${
                      on ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>

          {plan.ok && (
            <div className="rounded-xl bg-primary/15 p-4 text-center">
              <p className="text-xs text-muted-foreground">Cada time enfrenta o outro</p>
              <p className="text-3xl font-bold text-primary">
                {edit && previous != null && previous !== plan.turns && (
                  <span className="mr-2 text-lg font-normal text-muted-foreground line-through">{previous}</span>
                )}
                {edit && previous != null && previous !== plan.turns ? "→ " : ""}
                {times(plan.turns)}
              </p>
            </div>
          )}

          {(plan.ok || plan.days > 0) && (
            <div className="space-y-1 rounded-xl bg-card p-3 text-sm">
              {rows.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 py-0.5">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-right font-medium">{value}</span>
                </div>
              ))}
            </div>
          )}

          {plan.ok ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {n % 2 === 1
                ? "Número ímpar de times: em cada rodada um time folga, e a folga gira entre todos por igual. "
                : ""}
              Todos os times jogam o mesmo número de partidas.
            </p>
          ) : (
            <p className="rounded-xl bg-destructive/15 p-3 text-xs leading-relaxed text-destructive">{plan.error}</p>
          )}

          <Button
            className="h-12 w-full rounded-full font-semibold"
            disabled={!plan.ok || save.isPending}
            onClick={() => save.mutate()}
          >
            {edit ? "Recalcular calendário" : "Gerar calendário"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
