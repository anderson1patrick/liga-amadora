// Vencimento mensal: sempre no mesmo dia do mês. Datas como "AAAA-MM-DD" (horário de Brasília).

const DAY = 86_400_000;
const ms = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y!, (m ?? 1) - 1, d ?? 1);
};
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

export function diffDays(a: string, b: string) {
  return Math.round((ms(a) - ms(b)) / DAY);
}

export function formatBR(date: string) {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

// Mesmo dia do mês seguinte; se o mês não tem esse dia, usa o último dia dele.
export function addMonthClamped(date: string, day: number) {
  const [y, m] = date.split("-").map(Number);
  const first = Date.UTC(y!, m!, 1);
  const last = new Date(Date.UTC(y!, m! + 1, 0)).getUTCDate();
  return iso(first + (Math.min(day, last) - 1) * DAY);
}

export type BillingAccount = {
  trial_ends_on: string;
  paid_until: string | null;
  billing_day: number | null;
};

export function currentEnd(a: BillingAccount) {
  return a.paid_until && a.paid_until > a.trial_ends_on ? a.paid_until : a.trial_ends_on;
}

// Prévia do que o banco vai gravar ao registrar um pagamento.
export function previewPayment(a: BillingAccount, paidOn: string, months: number) {
  const end = currentEnd(a);
  const late = paidOn > end;
  const day = late ? Number(paidOn.slice(8, 10)) : (a.billing_day ?? Number(end.slice(8, 10)));
  let next = late ? paidOn : end;
  for (let i = 0; i < months; i++) next = addMonthClamped(next, day);
  return { late, day, paidUntil: next };
}
