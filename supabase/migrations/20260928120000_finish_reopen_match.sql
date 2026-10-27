CREATE OR REPLACE FUNCTION public.finish_match(_match_id uuid, _home int, _away int)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE cid uuid;
BEGIN
  SELECT championship_id INTO cid FROM public.matches WHERE id = _match_id;
  IF cid IS NULL OR NOT public.owns_championship(cid) THEN RAISE EXCEPTION 'not allowed'; END IF;
  UPDATE public.matches SET status='finished', home_goals=_home, away_goals=_away, played_at=now() WHERE id=_match_id;
  PERFORM public.recompute_suspensions(cid);
END $$;

CREATE OR REPLACE FUNCTION public.reopen_match(_match_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE cid uuid;
BEGIN
  SELECT championship_id INTO cid FROM public.matches WHERE id = _match_id;
  IF cid IS NULL OR NOT public.owns_championship(cid) THEN RAISE EXCEPTION 'not allowed'; END IF;
  UPDATE public.matches SET status='scheduled' WHERE id=_match_id;
  PERFORM public.recompute_suspensions(cid);
END $$;

REVOKE ALL ON FUNCTION public.finish_match(uuid,int,int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reopen_match(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finish_match(uuid,int,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_match(uuid) TO authenticated;
