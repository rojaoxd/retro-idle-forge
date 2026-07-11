
-- ============================================
-- RESET: drop tudo relacionado a conteúdo de jogo antigo
-- Preserva profiles, user_roles, characters (schema novo abaixo)
-- ============================================

-- 1) Drop tabelas de conteúdo de jogo (amadoras / substituídas pelo engine XML/OTBM)
DROP TABLE IF EXISTS
  public.game_items,
  public.game_objects,
  public.game_object_sprites,
  public.game_sprites,
  public.game_creatures,
  public.game_visual_effects,
  public.game_config,
  public.map_tiles,
  public.map_areas,
  public.map_palettes,
  public.object_import_jobs,
  public.otserv_items,
  public.otserv_monsters,
  public.otserv_npcs,
  public.otserv_outfits,
  public.otserv_raids,
  public.otserv_scripts_registry,
  public.otserv_spawns,
  public.otserv_spells,
  public.otserv_stages,
  public.otserv_towns,
  public.otserv_vocations,
  public.otserv_world_tiles,
  public.otserv_channels,
  public.otserv_groups,
  public.otserv_houses,
  public.monsters,
  public.npcs,
  public.npc_keywords,
  public.npc_trades,
  public.quests,
  public.quest_steps,
  public.scripts_actions,
  public.scripts_movements,
  public.spells,
  public.vocations,
  public.vocations_catalog,
  public.server_configs,
  public.server_logs,
  public.online_players
CASCADE;

-- 2) Reset da tabela characters para o schema do engine Tibia74
DROP TABLE IF EXISTS public.characters CASCADE;

CREATE TABLE public.characters (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              text NOT NULL UNIQUE,
  sex               text NOT NULL DEFAULT 'male' CHECK (sex IN ('male','female')),
  vocation          integer NOT NULL DEFAULT 0,
  level             integer NOT NULL DEFAULT 1,
  experience        bigint  NOT NULL DEFAULT 0,
  health            integer NOT NULL DEFAULT 150,
  health_max        integer NOT NULL DEFAULT 150,
  mana              integer NOT NULL DEFAULT 0,
  mana_max          integer NOT NULL DEFAULT 0,
  capacity          integer NOT NULL DEFAULT 400,
  pos_x             integer NOT NULL DEFAULT 32097,
  pos_y             integer NOT NULL DEFAULT 32219,
  pos_z             integer NOT NULL DEFAULT 7,
  direction         integer NOT NULL DEFAULT 2,
  skills            jsonb   NOT NULL DEFAULT '{"fist":10,"club":10,"sword":10,"axe":10,"distance":10,"shielding":10,"fishing":10,"magic":0}'::jsonb,
  skill_tries       jsonb   NOT NULL DEFAULT '{}'::jsonb,
  inventory         jsonb   NOT NULL DEFAULT '{"slots":{},"containers":{}}'::jsonb,
  depot             jsonb   NOT NULL DEFAULT '{}'::jsonb,
  inbox             jsonb   NOT NULL DEFAULT '[]'::jsonb,
  outfit            jsonb   NOT NULL DEFAULT '{"lookType":128,"head":78,"body":88,"legs":95,"feet":115,"addons":0,"mount":0}'::jsonb,
  spells_known      text[]  NOT NULL DEFAULT '{}',
  conditions        jsonb   NOT NULL DEFAULT '[]'::jsonb,
  friends           jsonb   NOT NULL DEFAULT '[]'::jsonb,
  online            boolean NOT NULL DEFAULT false,
  last_login_at     timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT characters_name_format CHECK (
    length(name) BETWEEN 3 AND 20
    AND name ~ '^[A-Za-z][A-Za-z ]*[A-Za-z]$'
  )
);

CREATE INDEX characters_user_id_idx ON public.characters(user_id);
CREATE INDEX characters_online_idx  ON public.characters(online) WHERE online = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.characters TO authenticated;
GRANT ALL ON public.characters TO service_role;

ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own characters read"   ON public.characters FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own characters insert" ON public.characters FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own characters update" ON public.characters FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own characters delete" ON public.characters FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER characters_updated_at
  BEFORE UPDATE ON public.characters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) server_logs enxuto (só operação: login, kill, gm command, broadcast)
CREATE TABLE public.server_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level      text NOT NULL DEFAULT 'info',
  source     text NOT NULL,
  message    text NOT NULL,
  meta       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX server_logs_created_at_idx ON public.server_logs(created_at DESC);

GRANT SELECT ON public.server_logs TO authenticated;
GRANT ALL ON public.server_logs TO service_role;

ALTER TABLE public.server_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads server logs"
  ON public.server_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4) server_broadcasts (motd + broadcast em tempo real editados na /dev)
CREATE TABLE public.server_broadcasts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind       text NOT NULL CHECK (kind IN ('motd','broadcast')),
  message    text NOT NULL,
  active     boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.server_broadcasts TO authenticated;
GRANT ALL ON public.server_broadcasts TO service_role;

ALTER TABLE public.server_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads active motd" ON public.server_broadcasts FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "admin manages broadcasts" ON public.server_broadcasts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER server_broadcasts_updated_at
  BEFORE UPDATE ON public.server_broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
