
CREATE OR REPLACE FUNCTION public.owns_championship(_championship_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.championships c
    WHERE c.id = _championship_id AND c.owner_id = auth.uid()
  )
$$;
