
CREATE TABLE public.map_tiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  x integer NOT NULL,
  y integer NOT NULL,
  layer text NOT NULL CHECK (layer IN ('floor','obstacles')),
  tile_id integer NOT NULL REFERENCES public.game_sprites(id) ON DELETE RESTRICT,
  blocking boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (x, y, layer)
);

CREATE INDEX map_tiles_xy_idx ON public.map_tiles (x, y);
CREATE INDEX map_tiles_layer_idx ON public.map_tiles (layer);

GRANT SELECT ON public.map_tiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.map_tiles TO authenticated;
GRANT ALL ON public.map_tiles TO service_role;

ALTER TABLE public.map_tiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "map_tiles are readable by everyone"
  ON public.map_tiles FOR SELECT
  USING (true);

CREATE POLICY "admins can insert map_tiles"
  ON public.map_tiles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins can update map_tiles"
  ON public.map_tiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins can delete map_tiles"
  ON public.map_tiles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER map_tiles_set_updated_at
  BEFORE UPDATE ON public.map_tiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.map_tiles;
