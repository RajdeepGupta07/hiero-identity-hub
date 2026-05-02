
-- Fix search_path on update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Restrict verification_logs insert policy to only allow verifier to insert
DROP POLICY "Authenticated users can insert verification logs" ON public.verification_logs;
CREATE POLICY "Verifiers can insert verification logs" ON public.verification_logs
  FOR INSERT TO authenticated
  WITH CHECK (verifier_id = auth.uid());

-- Revoke public execute on security definer functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM public, anon;
