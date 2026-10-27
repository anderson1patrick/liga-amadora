import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/account";
import { currentEnd, diffDays, formatBR, previewPayment } from "@/lib/billing";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Liga Amadora" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

type Row = {
  user_id: string;
  email: string;
  created_at: string;
  trial_ends_on: string;
  paid_until: string | null;
  billing_day: number | null;
  last_payment_on: string | null;
  blocked: boolean;
  admin_note: string | null;
  championships: number;
};
type Data = { today: string; rows: Row[] };

function statusOf(r: Row, today: string) {
  const end = currentEnd(r);
  if (r.blocked) return { key: "bloqueada", label: "Bloqueada", color: "text-destructive" };
  if (today > end)
    return {
      key: "vencida",
      label: r.paid_until ? `Venceu em ${formatBR(end).slice(0, 5)}` : "Teste vencido",
      color: "text-muted-foreground",
    };
  if (r.paid_until && today <= r.paid_until)
    return { key: "assinante", label: `Assinante até ${formatBR(r.paid_until).slice(0, 5)}`, color: "text-primary" };
  const d = diffDays(r.trial_ends_on, today);
  return { key: "teste", label: d === 0 ? "Em teste · último dia" : `Em teste · ${d} dias`, color: "text-champion" };
}

const FILTERS = [
  ["todos", "Todos"],
  ["teste", "Em teste"],
  ["assinante", "Assinantes"],
  ["vencida", "Vencidos"],
  ["bloqueada", "Bloqueados"],
] as const;

function AdminPage() {
  const admin = useIsAdmin();
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("todos");
  const [term, setTerm] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["admin-accounts"],
    enabled: admin.data === true,
    queryFn: async (): Promise<Data> => {
      const { data, error } = await supabase.rpc("admin_list_accounts" as never);
      if (error) throw error;
      return data as unknown as Data;
    },
  });

  const rows = list.data?.rows ?? [];
  const today = list.data?.today ?? "";
  const counts = useMemo(() => {
    const c = { teste: 0, assinante: 0, vencida: 0, bloqueada: 0 };
    for (const r of rows) c[statusOf(r, today).key as keyof typeof c]++;
    return c;
  }, [rows, today]);

  if (admin.isLoading) return <p className="px-5 py-8 text-sm text-muted-foreground">Carregando…</p>;
  if (!admin.data) {
    return (
      <main className="px-5 py-10 text-center">
        <p className="text-sm text-muted-foreground">Acesso restrito.</p>
        <Link to="/campeonatos" className="mt-4 inline-block text-sm text-primary">Voltar</Link>
      </main>
    );
  }

  const current = rows.find((r) => r.user_id === selected);
  if (current) return <Detail row={current} today={today} onBack={() => setSelected(null)} />;

  const shown = rows.filter(
    (r) =>
      (filter === "todos" || statusOf(r, today).key === filter) &&
      r.email.toLowerCase().includes(term.trim().toLowerCase()),
  );

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-16 pt-6">
      <header className="flex items-center gap-3">
        <Link to="/conta" className="grid size-9 place-items-center rounded-full bg-card" aria-label="Voltar">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-3xl text-foreground">Painel admin</h1>
      </header>

      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        {[
          ["Contas", rows.length, ""],
          ["Em teste", counts.teste, "text-champion"],
          ["Assinantes", counts.assinante, "text-primary"],
          ["Bloq.", counts.bloqueada, "text-destructive"],
        ].map(([label, n, c]) => (
          <div key={String(label)} className="rounded-xl bg-card py-2">
            <p className={`text-xl font-semibold ${c}`}>{n}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <label className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-card px-3">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar por e-mail"
          aria-label="Buscar por e-mail"
          className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </label>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs ${
              filter === key ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        {list.isLoading && <p className="text-sm text-muted-foreground">Carregando contas…</p>}
        {shown.map((r) => {
          const s = statusOf(r, today);
          return (
            <button
              key={r.user_id}
              type="button"
              onClick={() => setSelected(r.user_id)}
              className="flex w-full items-center gap-2 rounded-2xl bg-card p-3 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{r.email}</span>
                <span className="mt-0.5 block text-xs">
                  <span className={s.color}>{s.label}</span>
                  <span className="text-muted-foreground">
                    {" · "}
                    {r.championships} {r.championships === 1 ? "campeonato" : "campeonatos"}
                  </span>
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          );
        })}
        {!list.isLoading && shown.length === 0 && (
          <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">Nenhuma conta encontrada.</p>
        )}
      </div>
    </main>
  );
}

function Detail({ row, today, onBack }: { row: Row; today: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const [paidOn, setPaidOn] = useState(today);
  const [months, setMonths] = useState(1);
  const [note, setNote] = useState(row.admin_note ?? "");
  const [confirmBlock, setConfirmBlock] = useState(false);
  useEffect(() => setNote(row.admin_note ?? ""), [row.admin_note]);

  const s = statusOf(row, today);
  const preview = previewPayment(row, paidOn || today, months);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-accounts"] });
  const fail = () => toast.error("Não foi possível salvar. Tente de novo.");

  const pay = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("admin_register_payment" as never, {
        _user: row.user_id, _paid_on: paidOn, _months: months,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(`Pagamento registrado. Vence em ${formatBR(preview.paidUntil)}.`); refresh(); },
    onError: fail,
  });
  const extend = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("admin_extend_trial" as never, { _user: row.user_id, _days: 7 } as never);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Mais 7 dias de teste."); refresh(); },
    onError: fail,
  });
  const block = useMutation({
    mutationFn: async (blocked: boolean) => {
      const { error } = await supabase.rpc("admin_set_blocked" as never, { _user: row.user_id, _blocked: blocked } as never);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: fail,
  });
  const saveNote = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("admin_set_note" as never, { _user: row.user_id, _note: note } as never);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Anotação salva."); refresh(); },
    onError: fail,
  });

  const info: [string, string][] = [
    ["Situação", s.label],
    ["Cadastro", formatBR(row.created_at.slice(0, 10))],
    ["Teste até", formatBR(row.trial_ends_on)],
    ["Último pagamento", row.last_payment_on ? formatBR(row.last_payment_on) : "—"],
    ["Vence todo dia", row.billing_day ? String(row.billing_day) : "—"],
    ["Acesso até", formatBR(currentEnd(row))],
    ["Campeonatos", String(row.championships)],
  ];

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-16 pt-6">
      <header className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="grid size-9 shrink-0 place-items-center rounded-full bg-card" aria-label="Voltar">
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="min-w-0 truncate text-lg font-semibold">{row.email}</h1>
      </header>

      <div className="mt-4 space-y-1 rounded-2xl bg-card p-4 text-sm">
        {info.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 py-0.5">
            <span className="text-muted-foreground">{k}</span>
            <span className={`text-right font-medium ${k === "Situação" ? s.color : ""}`}>{v}</span>
          </div>
        ))}
      </div>

      <section className="mt-4 rounded-2xl bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Registrar pagamento</p>
        <label className="mt-3 block text-xs text-muted-foreground" htmlFor="paid-on">Data do pagamento</label>
        <Input id="paid-on" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} className="mt-1 h-11" />
        <p className="mt-3 text-xs text-muted-foreground">Meses pagos</p>
        <div className="mt-1 grid grid-cols-4 gap-2">
          {[1, 3, 6, 12].map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={months === m}
              onClick={() => setMonths(m)}
              className={`rounded-xl py-2.5 text-sm font-medium ${months === m ? "bg-primary text-primary-foreground" : "bg-background"}`}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-1 rounded-xl bg-primary/15 p-3 text-sm">
          {preview.late && (
            <div className="flex justify-between"><span className="text-muted-foreground">Pagou depois do vencimento</span><span className="font-medium text-champion">o dia muda</span></div>
          )}
          <div className="flex justify-between"><span className="text-muted-foreground">Novo vencimento</span><span className="font-semibold text-primary">{formatBR(preview.paidUntil)}</span></div>
        </div>
        <Button className="mt-3 h-12 w-full rounded-full font-semibold" disabled={!paidOn || pay.isPending} onClick={() => pay.mutate()}>
          Registrar pagamento
        </Button>
      </section>

      <Button variant="outline" className="mt-3 h-11 w-full" disabled={extend.isPending} onClick={() => extend.mutate()}>
        Dar mais 7 dias de teste
      </Button>

      <section className="mt-4">
        <p className="mb-1 text-xs text-muted-foreground">Anotação (só você vê)</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          placeholder="Ex.: pagou Pix em 10/11, R$ 15"
          className="min-h-20 w-full rounded-xl border border-border bg-card p-3 text-sm outline-none"
        />
        <Button variant="outline" className="mt-2 h-10 w-full" disabled={saveNote.isPending} onClick={() => saveNote.mutate()}>
          Salvar anotação
        </Button>
      </section>

      <Button
        variant={row.blocked ? "default" : "outline"}
        className={`mt-6 h-12 w-full rounded-full font-semibold ${row.blocked ? "" : "border-destructive/60 text-destructive"}`}
        onClick={() => (row.blocked ? block.mutate(false) : setConfirmBlock(true))}
      >
        {row.blocked ? "Reativar conta" : "Bloquear conta"}
      </Button>

      <ConfirmDialog
        open={confirmBlock}
        onOpenChange={setConfirmBlock}
        title="Bloquear conta?"
        description={`${row.email} não vai conseguir criar nem editar nada até você reativar. Os dados e o link público dela continuam.`}
        confirmLabel="Bloquear"
        onConfirm={() => {
          setConfirmBlock(false);
          block.mutate(true);
        }}
      />
    </main>
  );
}
