
-- ============================================================
-- game_objects (Object Builder / .dat)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.game_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id integer UNIQUE,
  name text NOT NULL,
  object_kind text NOT NULL DEFAULT 'item'
    CHECK (object_kind IN ('item','ground','container','weapon','armor','fluid','splash','deco','creature','wall','effect')),
  width smallint NOT NULL DEFAULT 1 CHECK (width BETWEEN 1 AND 4),
  height smallint NOT NULL DEFAULT 1 CHECK (height BETWEEN 1 AND 4),
  layers smallint NOT NULL DEFAULT 1,
  pattern_x smallint NOT NULL DEFAULT 1,
  pattern_y smallint NOT NULL DEFAULT 1,
  pattern_z smallint NOT NULL DEFAULT 1,
  frames smallint NOT NULL DEFAULT 1,
  frame_duration_ms integer NOT NULL DEFAULT 250,
  flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  palette_group text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_objects TO authenticated;
GRANT SELECT ON public.game_objects TO anon;
GRANT ALL ON public.game_objects TO service_role;
ALTER TABLE public.game_objects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_objects_all" ON public.game_objects FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_write_objects" ON public.game_objects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_game_objects_updated BEFORE UPDATE ON public.game_objects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- game_object_sprites (composition)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.game_object_sprites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id uuid NOT NULL REFERENCES public.game_objects(id) ON DELETE CASCADE,
  sprite_id integer NOT NULL REFERENCES public.game_sprites(id) ON DELETE RESTRICT,
  layer smallint NOT NULL DEFAULT 0,
  pattern_x smallint NOT NULL DEFAULT 0,
  pattern_y smallint NOT NULL DEFAULT 0,
  pattern_z smallint NOT NULL DEFAULT 0,
  frame smallint NOT NULL DEFAULT 0,
  cell_x smallint NOT NULL DEFAULT 0,
  cell_y smallint NOT NULL DEFAULT 0,
  UNIQUE (object_id, layer, pattern_x, pattern_y, pattern_z, frame, cell_x, cell_y)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_object_sprites TO authenticated;
GRANT SELECT ON public.game_object_sprites TO anon;
GRANT ALL ON public.game_object_sprites TO service_role;
ALTER TABLE public.game_object_sprites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_object_sprites_all" ON public.game_object_sprites FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_write_object_sprites" ON public.game_object_sprites FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- game_sprites : extras
-- ============================================================
ALTER TABLE public.game_sprites
  ADD COLUMN IF NOT EXISTS hash text,
  ADD COLUMN IF NOT EXISTS palette_group text;
CREATE INDEX IF NOT EXISTS idx_game_sprites_hash ON public.game_sprites(hash);
CREATE INDEX IF NOT EXISTS idx_game_sprites_palette ON public.game_sprites(palette_group);

-- ============================================================
-- map_tiles : eixo Z + object_id
-- ============================================================
ALTER TABLE public.map_tiles
  ADD COLUMN IF NOT EXISTS z smallint NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS object_id uuid REFERENCES public.game_objects(id) ON DELETE SET NULL;
-- drop old unique(x,y,layer) se existir; recria com z
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'map_tiles_x_y_layer_key') THEN
    ALTER TABLE public.map_tiles DROP CONSTRAINT map_tiles_x_y_layer_key;
  END IF;
END$$;
CREATE UNIQUE INDEX IF NOT EXISTS map_tiles_xyz_layer_key ON public.map_tiles(x,y,z,layer);
CREATE INDEX IF NOT EXISTS idx_map_tiles_z ON public.map_tiles(z);

-- ============================================================
-- map_palettes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.map_palettes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  palette_group text NOT NULL DEFAULT 'nature'
    CHECK (palette_group IN ('nature','town','dungeon','walls','creatures','items','effects','misc')),
  object_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.map_palettes TO authenticated;
GRANT ALL ON public.map_palettes TO service_role;
ALTER TABLE public.map_palettes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_palettes_auth" ON public.map_palettes FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_palettes" ON public.map_palettes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_map_palettes_updated BEFORE UPDATE ON public.map_palettes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- map_areas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.map_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  x1 integer NOT NULL, y1 integer NOT NULL,
  x2 integer NOT NULL, y2 integer NOT NULL,
  z_min smallint NOT NULL DEFAULT 7,
  z_max smallint NOT NULL DEFAULT 7,
  kind text NOT NULL DEFAULT 'city'
    CHECK (kind IN ('city','dungeon','pvp','nopvp','nologout','protection','custom')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.map_areas TO authenticated;
GRANT ALL ON public.map_areas TO service_role;
ALTER TABLE public.map_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_areas_auth" ON public.map_areas FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_areas" ON public.map_areas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_map_areas_updated BEFORE UPDATE ON public.map_areas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- scripts_actions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scripts_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  target_kind text NOT NULL DEFAULT 'item_id'
    CHECK (target_kind IN ('item_id','action_id','unique_id')),
  target_value integer NOT NULL,
  code text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scripts_actions TO authenticated;
GRANT ALL ON public.scripts_actions TO service_role;
ALTER TABLE public.scripts_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_actions_auth" ON public.scripts_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_actions" ON public.scripts_actions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_scripts_actions_updated BEFORE UPDATE ON public.scripts_actions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- scripts_movements
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scripts_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  target_kind text NOT NULL DEFAULT 'tile_object_id'
    CHECK (target_kind IN ('tile_object_id','action_id','unique_id','equip_slot')),
  target_value integer NOT NULL,
  event text NOT NULL DEFAULT 'onStepIn'
    CHECK (event IN ('onStepIn','onStepOut','onEquip','onDeEquip','onAddItem','onRemoveItem')),
  code text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scripts_movements TO authenticated;
GRANT ALL ON public.scripts_movements TO service_role;
ALTER TABLE public.scripts_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_moves_auth" ON public.scripts_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_moves" ON public.scripts_movements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_scripts_movements_updated BEFORE UPDATE ON public.scripts_movements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- npcs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.npcs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sprite_object_id uuid REFERENCES public.game_objects(id) ON DELETE SET NULL,
  outfit jsonb NOT NULL DEFAULT '{}'::jsonb,
  walk_radius integer NOT NULL DEFAULT 0,
  speech_greet text[] NOT NULL DEFAULT '{}',
  speech_farewell text[] NOT NULL DEFAULT '{}',
  idle_messages text[] NOT NULL DEFAULT '{}',
  spawn_x integer, spawn_y integer, spawn_z smallint DEFAULT 7,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.npcs TO authenticated;
GRANT SELECT ON public.npcs TO anon;
GRANT ALL ON public.npcs TO service_role;
ALTER TABLE public.npcs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_npcs_all" ON public.npcs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_write_npcs" ON public.npcs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_npcs_updated BEFORE UPDATE ON public.npcs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- npc_trades
CREATE TABLE IF NOT EXISTS public.npc_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  npc_id uuid NOT NULL REFERENCES public.npcs(id) ON DELETE CASCADE,
  object_id uuid NOT NULL REFERENCES public.game_objects(id) ON DELETE CASCADE,
  buy_price integer,
  sell_price integer,
  currency text NOT NULL DEFAULT 'gold',
  stock integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.npc_trades TO authenticated;
GRANT SELECT ON public.npc_trades TO anon;
GRANT ALL ON public.npc_trades TO service_role;
ALTER TABLE public.npc_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_trades_all" ON public.npc_trades FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_write_trades" ON public.npc_trades FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- npc_keywords
CREATE TABLE IF NOT EXISTS public.npc_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  npc_id uuid NOT NULL REFERENCES public.npcs(id) ON DELETE CASCADE,
  keywords text[] NOT NULL DEFAULT '{}',
  answer text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.npc_keywords TO authenticated;
GRANT SELECT ON public.npc_keywords TO anon;
GRANT ALL ON public.npc_keywords TO service_role;
ALTER TABLE public.npc_keywords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_keywords_all" ON public.npc_keywords FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_write_keywords" ON public.npc_keywords FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- quests / quest_steps
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  storage_key text NOT NULL,
  storage_value integer NOT NULL DEFAULT 1,
  min_level integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quests TO authenticated;
GRANT SELECT ON public.quests TO anon;
GRANT ALL ON public.quests TO service_role;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_quests_all" ON public.quests FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_write_quests" ON public.quests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_quests_updated BEFORE UPDATE ON public.quests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.quest_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id uuid NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  step_order integer NOT NULL DEFAULT 0,
  kind text NOT NULL DEFAULT 'talk'
    CHECK (kind IN ('talk','kill','collect','reach_tile')),
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  reward jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quest_steps TO authenticated;
GRANT SELECT ON public.quest_steps TO anon;
GRANT ALL ON public.quest_steps TO service_role;
ALTER TABLE public.quest_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_qsteps_all" ON public.quest_steps FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_write_qsteps" ON public.quest_steps FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
