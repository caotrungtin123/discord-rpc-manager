DROP FUNCTION public.has_role(uuid, public.app_role);

CREATE POLICY "No direct token secret access"
ON public.token_secrets
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);