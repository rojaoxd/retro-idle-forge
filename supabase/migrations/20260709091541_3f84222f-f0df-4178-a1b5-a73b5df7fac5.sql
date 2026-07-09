
-- ============ ROLES ============
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ updated_at trigger fn ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============ SPRITES ============
CREATE TABLE public.game_sprites (
  id BIGSERIAL PRIMARY KEY,
  sheet_url TEXT NOT NULL,
  x INT NOT NULL DEFAULT 0,
  y INT NOT NULL DEFAULT 0,
  width INT NOT NULL DEFAULT 32,
  height INT NOT NULL DEFAULT 32,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_sprites TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.game_sprites_id_seq TO authenticated;
GRANT ALL ON public.game_sprites TO service_role;
GRANT ALL ON SEQUENCE public.game_sprites_id_seq TO service_role;
ALTER TABLE public.game_sprites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage sprites" ON public.game_sprites
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_sprites_updated BEFORE UPDATE ON public.game_sprites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ ITEMS ============
CREATE TABLE public.game_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sprite_id BIGINT REFERENCES public.game_sprites(id) ON DELETE SET NULL,
  weight NUMERIC NOT NULL DEFAULT 0,
  capacity INT NOT NULL DEFAULT 0,
  attack INT NOT NULL DEFAULT 0,
  defense INT NOT NULL DEFAULT 0,
  armor INT NOT NULL DEFAULT 0,
  weapon_type TEXT,
  is_solid BOOLEAN NOT NULL DEFAULT false,
  is_container BOOLEAN NOT NULL DEFAULT false,
  is_stackable BOOLEAN NOT NULL DEFAULT false,
  is_useable BOOLEAN NOT NULL DEFAULT false,
  is_liquid_container BOOLEAN NOT NULL DEFAULT false,
  has_height BOOLEAN NOT NULL DEFAULT false,
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_items TO authenticated;
GRANT ALL ON public.game_items TO service_role;
ALTER TABLE public.game_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage items" ON public.game_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_items_updated BEFORE UPDATE ON public.game_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ CREATURES ============
CREATE TABLE public.game_creatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  look_id INT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  animations JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_creatures TO authenticated;
GRANT ALL ON public.game_creatures TO service_role;
ALTER TABLE public.game_creatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage creatures" ON public.game_creatures
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_creatures_updated BEFORE UPDATE ON public.game_creatures
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ EFFECTS ============
CREATE TABLE public.game_visual_effects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('missile','effect')),
  frames JSONB NOT NULL DEFAULT '[]'::jsonb,
  frame_rate_ms INT NOT NULL DEFAULT 120,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_visual_effects TO authenticated;
GRANT ALL ON public.game_visual_effects TO service_role;
ALTER TABLE public.game_visual_effects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage effects" ON public.game_visual_effects
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_effects_updated BEFORE UPDATE ON public.game_visual_effects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ CONFIG (singleton) ============
CREATE TABLE public.game_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_config TO authenticated;
GRANT ALL ON public.game_config TO service_role;
ALTER TABLE public.game_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage config" ON public.game_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_config_updated BEFORE UPDATE ON public.game_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.game_config (id, config) VALUES (1, '{}'::jsonb) ON CONFLICT DO NOTHING;
