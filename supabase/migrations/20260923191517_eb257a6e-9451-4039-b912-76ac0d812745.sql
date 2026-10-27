
CREATE TABLE public.championships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  season TEXT,
  format TEXT NOT NULL DEFAULT 'single' CHECK (format IN ('single','double')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  championship_id UUID NOT NULL REFERENCES public.championships(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_name TEXT,
  crest_url TEXT,
  color TEXT NOT NULL DEFAULT '#22c55e',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  championship_id UUID NOT NULL REFERENCES public.championships(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT NOT NULL DEFAULT 'MEI',
  shirt_number INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  championship_id UUID NOT NULL REFERENCES public.championships(id) ON DELETE CASCADE,
  round INTEGER NOT NULL DEFAULT 1,
  leg INTEGER NOT NULL DEFAULT 1,
  home_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  away_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  home_goals INTEGER NOT NULL DEFAULT 0,
  away_goals INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','finished')),
  played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  championship_id UUID NOT NULL REFERENCES public.championships(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  assist_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  minute INTEGER,
  own_goal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  championship_id UUID NOT NULL REFERENCES public.championships(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  card_type TEXT NOT NULL CHECK (card_type IN ('yellow','red')),
  minute INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.suspensions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  championship_id UUID NOT NULL REFERENCES public.championships(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  origin_match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('yellow_accumulation','red_card')),
  matches_remaining INTEGER NOT NULL DEFAULT 1,
  served BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_teams_champ ON public.teams(championship_id);
CREATE INDEX idx_players_champ ON public.players(championship_id);
CREATE INDEX idx_players_team ON public.players(team_id);
CREATE INDEX idx_matches_champ ON public.matches(championship_id);
CREATE INDEX idx_goals_champ ON public.goals(championship_id);
CREATE INDEX idx_cards_champ ON public.cards(championship_id);
CREATE INDEX idx_susp_champ ON public.suspensions(championship_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.championships TO authenticated;
GRANT ALL ON public.championships TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO authenticated;
GRANT ALL ON public.players TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO authenticated;
GRANT ALL ON public.cards TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suspensions TO authenticated;
GRANT ALL ON public.suspensions TO service_role;

CREATE OR REPLACE FUNCTION public.owns_championship(_championship_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.championships c
    WHERE c.id = _championship_id AND c.owner_id = auth.uid()
  )
$$;

ALTER TABLE public.championships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suspensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own championships" ON public.championships FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "own teams" ON public.teams FOR ALL TO authenticated
  USING (public.owns_championship(championship_id)) WITH CHECK (public.owns_championship(championship_id));
CREATE POLICY "own players" ON public.players FOR ALL TO authenticated
  USING (public.owns_championship(championship_id)) WITH CHECK (public.owns_championship(championship_id));
CREATE POLICY "own matches" ON public.matches FOR ALL TO authenticated
  USING (public.owns_championship(championship_id)) WITH CHECK (public.owns_championship(championship_id));
CREATE POLICY "own goals" ON public.goals FOR ALL TO authenticated
  USING (public.owns_championship(championship_id)) WITH CHECK (public.owns_championship(championship_id));
CREATE POLICY "own cards" ON public.cards FOR ALL TO authenticated
  USING (public.owns_championship(championship_id)) WITH CHECK (public.owns_championship(championship_id));
CREATE POLICY "own suspensions" ON public.suspensions FOR ALL TO authenticated
  USING (public.owns_championship(championship_id)) WITH CHECK (public.owns_championship(championship_id));
