CREATE TABLE public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secret text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.admin_settings TO service_role;

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.admin_settings (secret) VALUES ('1234abcd');

CREATE OR REPLACE FUNCTION public.verify_admin_secret(_secret text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_settings WHERE secret = _secret);
$$;

GRANT EXECUTE ON FUNCTION public.verify_admin_secret(text) TO anon, authenticated;