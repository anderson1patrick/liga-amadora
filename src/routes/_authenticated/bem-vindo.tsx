import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/bem-vindo")({
  head: () => ({
    meta: [
      { title: "Bem-vindo — Liga Amadora" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Welcome,
});

const box = "rounded-2xl bg-card p-3";
const row = "flex items-center gap-2 rounded-xl bg-background p-2 text-sm";

function Dot({ c }: { c: string }) {
  return <span className="size-3.5 shrink-0 rounded-full" style={{ backgroundColor: c }} />;
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-xs">{children}</span>;
}

const slides: { title: string; text: string; art: ReactNode }[] = [
  {
    title: "Crie seu campeonato",
    text: "Cadastre os times e jogadores e gere todas as rodadas com um toque.",
    art: (
      <div className={box}>
        <p className="font-semibold">Copa da Vila 2026</p>
        <p className="mb-3 text-xs text-muted-foreground">Turno e returno · 8 times</p>
        <div className="space-y-1.5">
          <div className={row}><Dot c="#3ddc6a" /> Vila Nova</div>
          <div className={row}><Dot c="#4aa3ff" /> Unidos FC</div>
          <div className={row}><Dot c="#f2c14e" /> Sport Bairro</div>
          <div className="rounded-xl border border-dashed border-muted-foreground/40 p-2 text-center text-sm text-muted-foreground">
            + Novo time
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Lance os jogos pela súmula",
    text: "Um toque para gol, amarelo ou vermelho. O app calcula as suspensões sozinho.",
    art: (
      <div className={box}>
        <p className="mb-2 text-center text-3xl font-bold">2 × 1</p>
        <div className="space-y-1.5">
          {[
            ["9", "Diego", "1", "0", "0"],
            ["10", "Marcos", "1", "1", "0"],
            ["4", "Paulo", "0", "1", "1"],
          ].map(([n, name, g, y, r]) => (
            <div key={name} className={row}>
              <span className="w-5 text-center text-muted-foreground">{n}</span>
              <span className="flex-1">{name}</span>
              <Chip>⚽ {g}</Chip>
              <Chip>🟨 {y}</Chip>
              <Chip>🟥 {r}</Chip>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Tabela igual à do Brasileirão",
    text: "Pontos, saldo, gols e todos os critérios de desempate, atualizados na hora.",
    art: (
      <div className={box}>
        <div className="grid grid-cols-[1.25rem_1fr_2rem_2rem_2.5rem] px-1 pb-1 text-xs text-muted-foreground">
          <span>#</span><span>Time</span><span>P</span><span>J</span><span>SG</span>
        </div>
        {[
          ["Vila Nova", "24", "+12", "bg-champion"],
          ["Unidos FC", "21", "+8", "bg-libertadores"],
          ["Sport Bairro", "17", "+3", "bg-transparent"],
          ["Real Caxias", "9", "-6", "bg-relegation"],
        ].map(([t, p, sg, z], i) => (
          <div key={t} className="relative grid grid-cols-[1.25rem_1fr_2rem_2rem_2.5rem] items-center border-t border-border/60 px-1 py-2 text-sm">
            <span className={`absolute inset-y-0 -left-3 w-1 rounded ${z}`} />
            <span className="text-muted-foreground">{i + 1}</span><span>{t}</span>
            <b className="text-primary">{p}</b><span>10</span><span>{sg}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "Compartilhe com todo mundo",
    text: "Mande o link no grupo. A torcida e os jogadores acompanham pelo celular, sem cadastro.",
    art: (
      <div className={box}>
        <p className="text-xs text-muted-foreground">Link público</p>
        <p className="my-2 truncate rounded-lg border border-border bg-background p-2.5 font-mono text-xs">
          ligaamadora.app/p/x7k2m9qd
        </p>
        <div className="grid grid-cols-2 gap-2 text-center text-sm">
          <span className="rounded-lg bg-primary p-2.5 font-semibold text-primary-foreground">Copiar</span>
          <span className="rounded-lg border border-border p-2.5">WhatsApp</span>
        </div>
      </div>
    ),
  },
];

function Welcome() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [i, setI] = useState(0);
  const last = i === slides.length - 1;
  const slide = slides[i]!;

  async function finish() {
    await supabase.rpc("complete_onboarding" as never);
    await queryClient.invalidateQueries({ queryKey: ["account"] });
    navigate({ to: "/assinar", replace: true });
  }

  return (
    <main className="pitch-glow flex min-h-screen flex-col px-5 pb-8 pt-6">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="flex justify-end">
          <button type="button" onClick={finish} className="px-2 py-2 text-sm text-muted-foreground">
            Pular
          </button>
        </div>
        <div className="flex flex-1 flex-col justify-center">{slide.art}</div>
        <div className="pt-6 text-center">
          <h1 className="text-3xl text-foreground">{slide.title}</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{slide.text}</p>
          <div className="my-5 flex justify-center gap-1.5" aria-hidden>
            {slides.map((_, k) => (
              <span key={k} className={`h-1.5 rounded-full ${k === i ? "w-5 bg-primary" : "w-1.5 bg-border"}`} />
            ))}
          </div>
          <button
            type="button"
            onClick={() => (last ? finish() : setI(i + 1))}
            className="h-12 w-full rounded-full bg-primary text-base font-semibold text-primary-foreground active:scale-[0.99]"
          >
            {last ? "Continuar" : "Próximo"}
          </button>
        </div>
      </div>
    </main>
  );
}
