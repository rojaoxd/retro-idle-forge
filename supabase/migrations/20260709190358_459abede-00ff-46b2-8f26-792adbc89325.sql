-- server_configs (single row)
CREATE TABLE public.server_configs (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  status text NOT NULL DEFAULT 'online' CHECK (status IN ('online','maintenance')),
  motd text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.server_configs TO anon, authenticated;
GRANT ALL ON public.server_configs TO service_role;
ALTER TABLE public.server_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "server_configs public read" ON public.server_configs FOR SELECT USING (true);
CREATE POLICY "server_configs admin update" ON public.server_configs FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "server_configs admin insert" ON public.server_configs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER server_configs_set_updated BEFORE UPDATE ON public.server_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.server_configs (id, status) VALUES (1,'online') ON CONFLICT DO NOTHING;

-- online_players
CREATE TABLE public.online_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  character_name text NOT NULL,
  x integer NOT NULL DEFAULT 0,
  y integer NOT NULL DEFAULT 0,
  last_heartbeat timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX online_players_heartbeat_idx ON public.online_players(last_heartbeat DESC);
GRANT SELECT ON public.online_players TO authenticated;
GRANT ALL ON public.online_players TO service_role;
ALTER TABLE public.online_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "online_players admin read" ON public.online_players FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- server_logs
CREATE TABLE public.server_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  level text NOT NULL DEFAULT 'info' CHECK (level IN ('info','warn','error','debug')),
  source text NOT NULL DEFAULT 'system',
  message text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX server_logs_created_idx ON public.server_logs(created_at DESC);
GRANT SELECT, INSERT ON public.server_logs TO authenticated;
GRANT ALL ON public.server_logs TO service_role;
ALTER TABLE public.server_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "server_logs admin read" ON public.server_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "server_logs admin insert" ON public.server_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- monsters
CREATE TABLE public.monsters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  hp integer NOT NULL DEFAULT 100,
  speed integer NOT NULL DEFAULT 100,
  exp_reward integer NOT NULL DEFAULT 0,
  max_damage integer NOT NULL DEFAULT 0,
  sprite_id integer REFERENCES public.game_sprites(id) ON DELETE SET NULL,
  loot_table jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.monsters TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.monsters TO authenticated;
GRANT ALL ON public.monsters TO service_role;
ALTER TABLE public.monsters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "monsters public read" ON public.monsters FOR SELECT USING (true);
CREATE POLICY "monsters admin write" ON public.monsters FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER monsters_set_updated BEFORE UPDATE ON public.monsters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- vocations
CREATE TABLE public.vocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  hp_per_level integer NOT NULL DEFAULT 5,
  mana_per_level integer NOT NULL DEFAULT 5,
  capacity_per_level integer NOT NULL DEFAULT 10,
  hp_regen_ms integer NOT NULL DEFAULT 6000,
  mana_regen_ms integer NOT NULL DEFAULT 4000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vocations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.vocations TO authenticated;
GRANT ALL ON public.vocations TO service_role;
ALTER TABLE public.vocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vocations public read" ON public.vocations FOR SELECT USING (true);
CREATE POLICY "vocations admin write" ON public.vocations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER vocations_set_updated BEFORE UPDATE ON public.vocations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- spells
CREATE TABLE public.spells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  words text NOT NULL UNIQUE,
  mana_cost integer NOT NULL DEFAULT 0,
  min_level integer NOT NULL DEFAULT 1,
  vocation_id uuid REFERENCES public.vocations(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'attack' CHECK (kind IN ('healing','attack','support','rune')),
  effect_id uuid REFERENCES public.game_visual_effects(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.spells TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.spells TO authenticated;
GRANT ALL ON public.spells TO service_role;
ALTER TABLE public.spells ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spells public read" ON public.spells FOR SELECT USING (true);
CREATE POLICY "spells admin write" ON public.spells FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER spells_set_updated BEFORE UPDATE ON public.spells
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- extensions
ALTER TABLE public.game_items ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'misc'
  CHECK (item_type IN ('weapon','armor','rune','fluid','misc'));
ALTER TABLE public.map_tiles ADD COLUMN IF NOT EXISTS spawn_monster_id uuid REFERENCES public.monsters(id) ON DELETE SET NULL;
ALTER TABLE public.map_tiles DROP CONSTRAINT IF EXISTS map_tiles_layer_check;
ALTER TABLE public.map_tiles ADD CONSTRAINT map_tiles_layer_check CHECK (layer IN ('floor','obstacles','spawn'));

-- realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_configs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.online_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_logs;