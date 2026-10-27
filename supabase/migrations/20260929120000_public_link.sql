ALTER TABLE public.championships
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_token text UNIQUE;

CREATE OR REPLACE FUNCTION public.set_public_link(
  _championship_id uuid, _enabled boolean, _regenerate boolean DEFAULT false
) RETURNS text
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE tok text;
BEGIN
  IF NOT public.owns_championship(_championship_id) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  SELECT public_token INTO tok FROM public.championships WHERE id = _championship_id;
  IF _enabled AND (tok IS NULL OR _regenerate) THEN
    tok := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  END IF;
  UPDATE public.championships
    SET is_public = _enabled, public_token = tok
    WHERE id = _championship_id;
  RETURN CASE WHEN _enabled THEN tok END;
END $$;

CREATE OR REPLACE FUNCTION public.get_public_championship(_token text)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'championship', to_jsonb(c) - 'owner_id',
    'teams', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.name)
      FROM public.teams t WHERE t.championship_id = c.id), '[]'::jsonb),
    'players', COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.name)
      FROM public.players p WHERE p.championship_id = c.id), '[]'::jsonb),
    'matches', COALESCE((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.leg, m.round, m.created_at)
      FROM public.matches m WHERE m.championship_id = c.id), '[]'::jsonb),
    'goals', COALESCE((SELECT jsonb_agg(to_jsonb(g))
      FROM public.goals g WHERE g.championship_id = c.id), '[]'::jsonb),
    'cards', COALESCE((SELECT jsonb_agg(to_jsonb(k))
      FROM public.cards k WHERE k.championship_id = c.id), '[]'::jsonb),
    'suspensions', COALESCE((SELECT jsonb_agg(to_jsonb(s))
      FROM public.suspensions s WHERE s.championship_id = c.id), '[]'::jsonb)
  )
  FROM public.championships c
  WHERE c.public_token = _token AND c.is_public;
$$;

REVOKE ALL ON FUNCTION public.set_public_link(uuid, boolean, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_championship(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_public_link(uuid, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_championship(text) TO anon, authenticated;
