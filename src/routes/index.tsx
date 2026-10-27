import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronRight, Link2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { extractToken, getFollowed, removeFollowed, type Followed } from "@/lib/followed";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Liga Amadora — Campeonatos de futebol amador" },
      {
        name: "description",
        content:
          "Acompanhe a tabela, os jogos e a artilharia do seu campeonato, ou organize o seu com as regras do Brasileirão Série A.",
      },
      { property: "og:title", content: "Liga Amadora — Campeonatos com regras do Brasileirão" },
      {
        property: "og:description",
        content: "Classificação com todos os critérios de desempate, artilharia e suspensões automáticas.",
      },
    ],
  }),
  component: Landing,
});

type Result = {
  public_token: string;
  name: string;
  season: string | null;
  city: string | null;
  teams_count: number;
};

function Landing() {
  const navigate = useNavigate();
  const [link, setLink] = useState("");
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [followed, setFollowed] = useState<Followed[]>([]);

  useEffect(() => setFollowed(getFollowed()), []);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 350);
    return () => clearTimeout(t);
  }, [term]);

  const search = useQuery({
    queryKey: ["search-public", debounced],
    enabled: debounced.length >= 2,
    queryFn: async (): Promise<Result[]> => {
      const { data, error } = await supabase.rpc("search_public_championships" as never, {
        _q: debounced,
      } as never);
      if (error) throw error;
      return (data as unknown as Result[]) ?? [];
    },
  });

  function open(token: string) {
    navigate({ to: "/p/$token", params: { token } });
  }

  function openLink() {
    const token = extractToken(link);
    if (!token) {
      toast.error("Cole o link ou digite o código do campeonato.");
      return;
    }
    open(token);
  }

  const searching = debounced.length >= 2;

  return (
    <main className="pitch-glow min-h-screen px-5 pb-16 pt-12">
      <div className="mx-auto w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
            LA
          </div>
          <h1 className="mt-3 text-4xl leading-none text-foreground">Liga Amadora</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tabela, jogos e artilharia do campeonato da sua turma
          </p>
        </div>

        <section className="mt-7 rounded-2xl bg-card p-4">
          <h2 className="text-base font-semibold text-card-foreground">Acompanhar um campeonato</h2>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              openLink();
            }}
          >
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3">
              <Link2 className="size-4 shrink-0 text-muted-foreground" />
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="Cole o link ou o código"
                aria-label="Link ou código do campeonato"
                autoCapitalize="none"
                autoCorrect="off"
                className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>
            <button
              type="submit"
              className="rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground active:scale-95"
            >
              Abrir
            </button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            ou procure pelo nome
            <span className="h-px flex-1 bg-border" />
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Nome do campeonato ou cidade"
              aria-label="Procurar campeonato"
              className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>

          {searching && (
            <div className="mt-3 space-y-2">
              {search.isLoading ? (
                <p className="px-1 text-xs text-muted-foreground">Procurando…</p>
              ) : search.isError ? (
                <p className="px-1 text-xs text-destructive">Não foi possível buscar agora. Tente de novo.</p>
              ) : (search.data ?? []).length === 0 ? (
                <p className="px-1 text-xs leading-relaxed text-muted-foreground">
                  Nenhum campeonato encontrado. Só aparecem os que o organizador liberou para a busca.
                  Se você tem o link, cole no campo acima.
                </p>
              ) : (
                <>
                  <p className="px-1 text-xs uppercase tracking-widest text-muted-foreground">
                    {search.data!.length} {search.data!.length === 1 ? "campeonato encontrado" : "campeonatos encontrados"}
                  </p>
                  {search.data!.map((r) => (
                    <button
                      key={r.public_token}
                      type="button"
                      onClick={() => open(r.public_token)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl bg-background p-3 text-left"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{r.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {[r.city, r.season, `${r.teams_count} ${r.teams_count === 1 ? "time" : "times"}`]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </section>

        {followed.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Seguidos neste aparelho
            </h2>
            <div className="space-y-2">
              {followed.map((f) => (
                <div key={f.token} className="flex items-center gap-1 rounded-2xl bg-card pr-1">
                  <button
                    type="button"
                    onClick={() => open(f.token)}
                    className="flex min-w-0 flex-1 items-center justify-between gap-2 p-3 text-left"
                  >
                    <span className="truncate text-sm font-medium">{f.name}</span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Parar de seguir ${f.name}`}
                    onClick={() => {
                      removeFollowed(f.token);
                      setFollowed(getFollowed());
                    }}
                    className="grid size-9 place-items-center rounded-full text-muted-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8 border-t border-border pt-6 text-center">
          <p className="text-xs text-muted-foreground">Organiza um campeonato?</p>
          <Link
            to="/auth"
            className="mt-3 flex h-12 w-full items-center justify-center rounded-full border border-champion text-sm font-semibold text-champion active:scale-[0.99]"
          >
            Quero ser organizador
          </Link>
          <Link to="/auth" className="mt-4 inline-block text-xs text-primary">
            Já sou organizador? Entrar
          </Link>
        </section>
      </div>
    </main>
  );
}
