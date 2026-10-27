
CREATE OR REPLACE FUNCTION public.recompute_suspensions(_championship_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  m RECORD;
  c RECORD;
  v_cnt INT;
BEGIN
  IF NOT public.owns_championship(_championship_id) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  DELETE FROM public.suspensions WHERE championship_id = _championship_id;

  DROP TABLE IF EXISTS _pend;
  DROP TABLE IF EXISTS _yel;
  CREATE TEMP TABLE _pend (player_id UUID PRIMARY KEY, remaining INT NOT NULL, reason TEXT NOT NULL, origin UUID);
  CREATE TEMP TABLE _yel (player_id UUID PRIMARY KEY, cnt INT NOT NULL);

  FOR m IN
    SELECT * FROM public.matches
    WHERE championship_id = _championship_id AND status = 'finished'
    ORDER BY leg, round, created_at
  LOOP
    UPDATE _pend s SET remaining = s.remaining - 1
    FROM public.players pl
    WHERE pl.id = s.player_id
      AND pl.team_id IN (m.home_team_id, m.away_team_id)
      AND s.remaining > 0;

    DELETE FROM _pend WHERE remaining <= 0;

    FOR c IN SELECT * FROM public.cards WHERE match_id = m.id ORDER BY created_at LOOP
      IF c.card_type = 'yellow' THEN
        INSERT INTO _yel (player_id, cnt) VALUES (c.player_id, 1)
        ON CONFLICT (player_id) DO UPDATE SET cnt = _yel.cnt + 1;

        SELECT cnt INTO v_cnt FROM _yel WHERE player_id = c.player_id;
        IF v_cnt % 3 = 0 THEN
          INSERT INTO _pend (player_id, remaining, reason, origin)
          VALUES (c.player_id, 1, 'yellow_accumulation', m.id)
          ON CONFLICT (player_id) DO UPDATE
            SET remaining = _pend.remaining + 1, reason = 'yellow_accumulation', origin = m.id;
        END IF;
      ELSE
        INSERT INTO _pend (player_id, remaining, reason, origin)
        VALUES (c.player_id, 1, 'red_card', m.id)
        ON CONFLICT (player_id) DO UPDATE
          SET remaining = _pend.remaining + 1, reason = 'red_card', origin = m.id;
      END IF;
    END LOOP;
  END LOOP;

  INSERT INTO public.suspensions (championship_id, player_id, origin_match_id, reason, matches_remaining)
  SELECT _championship_id, player_id, origin, reason, remaining FROM _pend WHERE remaining > 0;

  DROP TABLE _pend;
  DROP TABLE _yel;
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_suspensions(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recompute_suspensions(UUID) TO authenticated;
