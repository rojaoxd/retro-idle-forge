-- 1. Relax map_tiles.tile_id FK so we can wipe game_sprites
ALTER TABLE public.map_tiles DROP CONSTRAINT IF EXISTS map_tiles_tile_id_fkey;
ALTER TABLE public.map_tiles
  ADD CONSTRAINT map_tiles_tile_id_fkey
  FOREIGN KEY (tile_id) REFERENCES public.game_sprites(id) ON DELETE SET NULL;

-- 2. Link OTB server items to dat client ids
ALTER TABLE public.otserv_items ADD COLUMN IF NOT EXISTS client_id integer;
CREATE INDEX IF NOT EXISTS otserv_items_client_id_idx ON public.otserv_items(client_id);

-- 3. Import jobs table (resumable Tibia.dat/.spr import)
CREATE TABLE IF NOT EXISTS public.object_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','running','paused','completed','failed')),
  dat_path text NOT NULL,
  spr_path text NOT NULL,
  otb_path text,
  categories jsonb NOT NULL DEFAULT '{"item":true,"outfit":true,"effect":true,"missile":true}'::jsonb,
  total integer NOT NULL DEFAULT 0,
  cursor integer NOT NULL DEFAULT 0,
  sprites_uploaded integer NOT NULL DEFAULT 0,
  objects_inserted integer NOT NULL DEFAULT 0,
  objects_updated integer NOT NULL DEFAULT 0,
  objects_skipped integer NOT NULL DEFAULT 0,
  error text,
  log jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.object_import_jobs TO authenticated;
GRANT ALL ON public.object_import_jobs TO service_role;

ALTER TABLE public.object_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage object_import_jobs"
  ON public.object_import_jobs
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER object_import_jobs_updated_at
  BEFORE UPDATE ON public.object_import_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();