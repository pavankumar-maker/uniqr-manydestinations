
ALTER TABLE public.qr_codes ADD COLUMN IF NOT EXISTS routing_mode text NOT NULL DEFAULT 'single';
ALTER TABLE public.qr_codes ADD COLUMN IF NOT EXISTS rotation_cursor integer NOT NULL DEFAULT 0;
ALTER TABLE public.qr_codes ADD CONSTRAINT qr_codes_routing_mode_chk CHECK (routing_mode IN ('single','rotation','weighted','device','priority'));

CREATE TABLE IF NOT EXISTS public.qr_destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id uuid NOT NULL REFERENCES public.qr_codes(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT '',
  target_url text NOT NULL,
  weight integer NOT NULL DEFAULT 1,
  device_filter text NOT NULL DEFAULT 'any' CHECK (device_filter IN ('any','mobile','tablet','desktop')),
  priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS qr_destinations_qr_id_idx ON public.qr_destinations(qr_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.qr_destinations TO authenticated;
GRANT ALL ON public.qr_destinations TO service_role;

ALTER TABLE public.qr_destinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage destinations" ON public.qr_destinations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.qr_codes q WHERE q.id = qr_destinations.qr_id AND q.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.qr_codes q WHERE q.id = qr_destinations.qr_id AND q.user_id = auth.uid()));

CREATE TRIGGER qr_destinations_set_updated_at
  BEFORE UPDATE ON public.qr_destinations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
