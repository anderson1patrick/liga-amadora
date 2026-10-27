import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { accessInfo, PRICE_LABEL, TRIAL_DAYS, useAccount } from "@/lib/account";
import { formatBR } from "@/lib/billing";

export const Route = createFileRoute("/_authenticated/assinar")({
  head: () => ({
    meta: [
      { title: "Plano organizador — Liga Amadora" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Subscribe,
});

const benefits = [
  "Tabela com os desempates do Brasileirão",
  "Súmula rápida e suspensões automáticas",
  "Link público e busca para a torcida",
];

function Subscribe() {
  const account = useAccount();
  const info = accessInfo(account.data);

  function subscribe() {
    toast.message("As instruções para assinar e renovar serão divulgadas em breve.");
  }

  const heading = info.blocked
    ? "Conta bloqueada"
    : info.subscribed
      ? info.dueToday ? "Sua assinatura vence hoje" : "Assinatura ativa"
      : info.trialActive
        ? "Organize seu campeonato"
        : "Seu acesso venceu";

  const subtitle = info.blocked
    ? "Fale com o suporte para reativar. Seus dados continuam salvos."
    : info.expired
      ? `Terminou em ${info.endDate ? formatBR(info.endDate) : ""}. Seus campeonatos continuam salvos e o link público segue funcionando.`
      : info.dueToday
        ? "Renove ainda hoje para não perder o acesso amanhã."
        : info.subscribed
          ? `Acesso até ${formatBR(info.endDate)}.`
          : `Faltam ${info.daysLeft} ${info.daysLeft === 1 ? "dia" : "dias"} do seu teste grátis`;

  return (
    <main className="pitch-glow flex min-h-screen flex-col px-5 pb-8 pt-10">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
            LA
          </div>
          <h1 className="mt-3 text-3xl text-foreground">{heading}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="mt-6 rounded-2xl border border-champion bg-card p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-champion">Plano organizador</p>
          <p className="mt-1 text-4xl font-bold">
            R$ 15<span className="text-base font-normal text-muted-foreground"> /mês</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {TRIAL_DAYS} dias grátis, sem cobrança. Depois, {PRICE_LABEL}. Cancele quando quiser.
          </p>
        </div>

        <ul className="mt-5 space-y-2.5 px-1 text-sm">
          {benefits.map((b) => (
            <li key={b} className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-primary" /> {b}
            </li>
          ))}
        </ul>

        <div className="flex-1" />

        <div className="mt-8 space-y-3">
          {info.hasAccess ? (
            <Link
              to="/campeonatos"
              className="flex h-13 w-full items-center justify-center rounded-full bg-champion py-3.5 text-base font-semibold text-background"
            >
              {info.subscribed ? "Meus campeonatos" : `Começar ${TRIAL_DAYS} dias grátis`}
            </Link>
          ) : null}
          {!info.subscribed && (
            <button
              type="button"
              onClick={subscribe}
              className={
                info.hasAccess
                  ? "w-full py-2 text-sm text-primary"
                  : "h-13 w-full rounded-full bg-champion py-3.5 text-base font-semibold text-background"
              }
            >
              {info.hasAccess ? "Assinar agora" : `Assinar por ${PRICE_LABEL}`}
            </button>
          )}
          {!info.hasAccess && (
            <Link to="/campeonatos" className="block w-full py-2 text-center text-sm text-muted-foreground">
              Ver meus campeonatos
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
