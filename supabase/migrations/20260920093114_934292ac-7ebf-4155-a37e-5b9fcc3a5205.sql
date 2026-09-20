ALTER TABLE public.presets
  ADD COLUMN city_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.presets
  ALTER COLUMN activity_name SET DEFAULT '';
