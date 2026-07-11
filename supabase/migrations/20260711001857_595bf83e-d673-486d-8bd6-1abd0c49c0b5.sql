
-- ============================================================
-- OTSERV 7.4 IMPORT SCHEMA
-- ============================================================

-- ---------- catálogos públicos (autenticados leem, admin escreve) ----------

CREATE TABLE public.otserv_items (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  article TEXT,
  plural TEXT,
  description TEXT,
  weight NUMERIC,
  attack INTEGER,
  defense INTEGER,
  armor INTEGER,
  range_val INTEGER,
  charges INTEGER,
  decayto INTEGER,
  duration INTEGER,
  transformequipto INTEGER,
  transformdeequipto INTEGER,
  slot_type TEXT,
  weapon_type TEXT,
  ammo_type TEXT,
  shoot_type TEXT,
  effect TEXT,
  fluid_source TEXT,
  writeable BOOLEAN DEFAULT false,
  maxtextlen INTEGER,
  flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_xml TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.otserv_items TO authenticated;
GRANT ALL ON public.otserv_items TO service_role;
ALTER TABLE public.otserv_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read items" ON public.otserv_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write items" ON public.otserv_items FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_otserv_items_updated BEFORE UPDATE ON public.otserv_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.otserv_monsters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  name_description TEXT,
  race TEXT,
  experience INTEGER NOT NULL DEFAULT 0,
  speed INTEGER NOT NULL DEFAULT 200,
  manacost INTEGER,
  health_max INTEGER NOT NULL DEFAULT 100,
  look JSONB NOT NULL DEFAULT '{}'::jsonb,
  flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  attacks JSONB NOT NULL DEFAULT '[]'::jsonb,
  defenses JSONB NOT NULL DEFAULT '{}'::jsonb,
  immunities JSONB NOT NULL DEFAULT '{}'::jsonb,
  elements JSONB NOT NULL DEFAULT '{}'::jsonb,
  summons JSONB NOT NULL DEFAULT '[]'::jsonb,
  voices JSONB NOT NULL DEFAULT '[]'::jsonb,
  loot JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_change JSONB NOT NULL DEFAULT '{}'::jsonb,
  strategy JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_xml TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.otserv_monsters TO authenticated;
GRANT ALL ON public.otserv_monsters TO service_role;
ALTER TABLE public.otserv_monsters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read monsters" ON public.otserv_monsters FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write monsters" ON public.otserv_monsters FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_otserv_monsters_updated BEFORE UPDATE ON public.otserv_monsters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.otserv_npcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  script_file TEXT,
  script_ref TEXT,
  walk_interval INTEGER DEFAULT 2000,
  floor_change BOOLEAN DEFAULT false,
  speed INTEGER,
  health_max INTEGER DEFAULT 100,
  look JSONB NOT NULL DEFAULT '{}'::jsonb,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  shop_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  travels JSONB NOT NULL DEFAULT '[]'::jsonb,
  voices JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_xml TEXT,
  raw_lua TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, script_file)
);
GRANT SELECT ON public.otserv_npcs TO authenticated;
GRANT ALL ON public.otserv_npcs TO service_role;
ALTER TABLE public.otserv_npcs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read npcs" ON public.otserv_npcs FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write npcs" ON public.otserv_npcs FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_otserv_npcs_updated BEFORE UPDATE ON public.otserv_npcs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.otserv_spells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL,           -- 'rune' | 'instant' | 'conjure'
  name TEXT NOT NULL,
  words TEXT,                    -- para instant/conjure
  item_id INTEGER,               -- para rune
  mana INTEGER DEFAULT 0,
  level INTEGER DEFAULT 0,
  maglv INTEGER DEFAULT 0,
  soul INTEGER DEFAULT 0,
  charges INTEGER,
  exhaustion INTEGER DEFAULT 0,
  premium BOOLEAN DEFAULT false,
  needtarget BOOLEAN DEFAULT false,
  selftarget BOOLEAN DEFAULT false,
  aggressive BOOLEAN DEFAULT true,
  allowfaruse BOOLEAN DEFAULT false,
  blocktype TEXT,
  range_val INTEGER,
  vocations JSONB NOT NULL DEFAULT '[]'::jsonb,
  conjure JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {conjureId, conjureCount, reagentId}
  event_type TEXT,               -- 'script' | 'function'
  event_value TEXT,              -- path do lua ou nome da função
  raw_xml TEXT,
  raw_lua TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (kind, name)
);
GRANT SELECT ON public.otserv_spells TO authenticated;
GRANT ALL ON public.otserv_spells TO service_role;
ALTER TABLE public.otserv_spells ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read spells" ON public.otserv_spells FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write spells" ON public.otserv_spells FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_otserv_spells_updated BEFORE UPDATE ON public.otserv_spells
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.otserv_vocations (
  id INTEGER PRIMARY KEY,
  client_id INTEGER,
  name TEXT NOT NULL,
  description TEXT,
  needpremium BOOLEAN DEFAULT false,
  from_voc INTEGER,
  gaincap INTEGER DEFAULT 10,
  gainhp INTEGER DEFAULT 5,
  gainmana INTEGER DEFAULT 5,
  gainhpticks INTEGER DEFAULT 6,
  gainhpamount INTEGER DEFAULT 1,
  gainmanaticks INTEGER DEFAULT 6,
  gainmanaamount INTEGER DEFAULT 2,
  manamultiplier NUMERIC DEFAULT 4.0,
  attackspeed INTEGER DEFAULT 2000,
  soulmax INTEGER DEFAULT 100,
  gainsoulticks INTEGER DEFAULT 120,
  lessloss INTEGER,
  formula JSONB NOT NULL DEFAULT '{}'::jsonb,
  skill JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_xml TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.otserv_vocations TO authenticated;
GRANT ALL ON public.otserv_vocations TO service_role;
ALTER TABLE public.otserv_vocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read vocs" ON public.otserv_vocations FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write vocs" ON public.otserv_vocations FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_otserv_vocs_updated BEFORE UPDATE ON public.otserv_vocations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.otserv_outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  look_type INTEGER NOT NULL,
  gender TEXT,                    -- 'male' | 'female'
  name TEXT NOT NULL,
  premium BOOLEAN DEFAULT false,
  unlocked BOOLEAN DEFAULT true,
  access INTEGER DEFAULT 0,
  quest_storage INTEGER,
  raw_xml TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (look_type, gender)
);
GRANT SELECT ON public.otserv_outfits TO authenticated;
GRANT ALL ON public.otserv_outfits TO service_role;
ALTER TABLE public.otserv_outfits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read outfits" ON public.otserv_outfits FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write outfits" ON public.otserv_outfits FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_otserv_outfits_updated BEFORE UPDATE ON public.otserv_outfits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.otserv_channels (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  logged BOOLEAN DEFAULT false,
  access INTEGER DEFAULT 0,
  level INTEGER DEFAULT 0,
  vocations JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_xml TEXT
);
GRANT SELECT ON public.otserv_channels TO authenticated;
GRANT ALL ON public.otserv_channels TO service_role;
ALTER TABLE public.otserv_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read channels" ON public.otserv_channels FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write channels" ON public.otserv_channels FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TABLE public.otserv_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_level INTEGER NOT NULL,
  max_level INTEGER,
  multiplier NUMERIC NOT NULL DEFAULT 1.0,
  world_id INTEGER
);
GRANT SELECT ON public.otserv_stages TO authenticated;
GRANT ALL ON public.otserv_stages TO service_role;
ALTER TABLE public.otserv_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read stages" ON public.otserv_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write stages" ON public.otserv_stages FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- ---------- catálogos restritos a admin ----------

CREATE TABLE public.otserv_towns (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  temple_x INTEGER NOT NULL,
  temple_y INTEGER NOT NULL,
  temple_z INTEGER NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.otserv_towns TO authenticated;
GRANT ALL ON public.otserv_towns TO service_role;
ALTER TABLE public.otserv_towns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin towns" ON public.otserv_towns FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TABLE public.otserv_houses (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  town_id INTEGER,
  entry_x INTEGER NOT NULL,
  entry_y INTEGER NOT NULL,
  entry_z INTEGER NOT NULL,
  size INTEGER,
  rent INTEGER,
  owner_character_id UUID,
  raw_xml TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.otserv_houses TO authenticated;
GRANT ALL ON public.otserv_houses TO service_role;
ALTER TABLE public.otserv_houses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin houses" ON public.otserv_houses FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_otserv_houses_updated BEFORE UPDATE ON public.otserv_houses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.otserv_spawns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_x INTEGER NOT NULL,
  center_y INTEGER NOT NULL,
  center_z INTEGER NOT NULL,
  radius INTEGER NOT NULL DEFAULT 1,
  creatures JSONB NOT NULL DEFAULT '[]'::jsonb   -- [{name,x,y,z,spawntime}]
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.otserv_spawns TO authenticated;
GRANT ALL ON public.otserv_spawns TO service_role;
ALTER TABLE public.otserv_spawns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin spawns" ON public.otserv_spawns FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX idx_otserv_spawns_pos ON public.otserv_spawns (center_z, center_x, center_y);

CREATE TABLE public.otserv_raids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  interval_sec INTEGER,
  margin INTEGER,
  enabled BOOLEAN DEFAULT true,
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_xml TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.otserv_raids TO authenticated;
GRANT ALL ON public.otserv_raids TO service_role;
ALTER TABLE public.otserv_raids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin raids" ON public.otserv_raids FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TABLE public.otserv_groups (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  flags BIGINT DEFAULT 0,
  custom_flags BIGINT DEFAULT 0,
  access_level INTEGER DEFAULT 0,
  violation_level INTEGER DEFAULT 0,
  raw_xml TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.otserv_groups TO authenticated;
GRANT ALL ON public.otserv_groups TO service_role;
ALTER TABLE public.otserv_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin groups" ON public.otserv_groups FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TABLE public.otserv_scripts_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_type TEXT NOT NULL,        -- action|movement|spell|weapon|creaturescript|talkaction|globalevent|npc
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,          -- caminho relativo dentro do otserv/data
  target JSONB NOT NULL DEFAULT '{}'::jsonb,   -- {itemid, uniqueid, actionid, event, words, ...}
  original_lua TEXT,
  ts_impl TEXT,
  status TEXT NOT NULL DEFAULT 'pending',   -- pending|translated|stub|skipped
  priority INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (script_type, file_path)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.otserv_scripts_registry TO authenticated;
GRANT ALL ON public.otserv_scripts_registry TO service_role;
ALTER TABLE public.otserv_scripts_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin scripts" ON public.otserv_scripts_registry FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX idx_otserv_scripts_status ON public.otserv_scripts_registry (script_type, status);
CREATE TRIGGER trg_otserv_scripts_updated BEFORE UPDATE ON public.otserv_scripts_registry
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- tiles do mundo importado ----------
-- separado de map_tiles (editor customizado) para preservar coordenadas originais 7.4

CREATE TABLE public.otserv_world_tiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  z INTEGER NOT NULL,
  ground_id INTEGER,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,    -- [{id, count, actionid, uniqueid, text, destination}]
  house_id INTEGER,
  tile_flags JSONB NOT NULL DEFAULT '{}'::jsonb, -- {protection, nopvp, nologout, refresh}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (x, y, z)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.otserv_world_tiles TO authenticated;
GRANT ALL ON public.otserv_world_tiles TO service_role;
ALTER TABLE public.otserv_world_tiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin world tiles" ON public.otserv_world_tiles FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX idx_otserv_wtiles_zxy ON public.otserv_world_tiles (z, x, y);
CREATE INDEX idx_otserv_wtiles_house ON public.otserv_world_tiles (house_id) WHERE house_id IS NOT NULL;
