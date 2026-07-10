
-- Enum de vocações
DO $$ BEGIN
  CREATE TYPE public.vocation_type AS ENUM ('none','knight','paladin','sorcerer','druid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Catálogo de vocações
CREATE TABLE public.vocations_catalog (
  id public.vocation_type PRIMARY KEY,
  label text NOT NULL,
  description text NOT NULL,
  hp_base int NOT NULL DEFAULT 150,
  mana_base int NOT NULL DEFAULT 0,
  cap_base int NOT NULL DEFAULT 400,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vocations_catalog TO anon, authenticated;
GRANT ALL ON public.vocations_catalog TO service_role;
ALTER TABLE public.vocations_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vocations_catalog readable by everyone"
ON public.vocations_catalog FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.vocations_catalog (id,label,description,hp_base,mana_base,cap_base) VALUES
  ('none','No Vocation','Aventureiro sem vocação. Escolha uma vocação avançada ao subir de nível.',150,0,400),
  ('knight','Knight','Guerreiro de linha de frente. Alto HP, forte com espada/machado/maça.',185,35,470),
  ('paladin','Paladin','Combatente à distância. Bom HP e mana, especialista em armas de arremesso.',175,105,410),
  ('sorcerer','Sorcerer','Mago ofensivo. Baixo HP, alto mana, dano mágico devastador.',150,175,360),
  ('druid','Druid','Mago da natureza. Baixo HP, alto mana, cura e magias de gelo.',150,175,360);

-- Characters
CREATE TABLE public.characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  vocation public.vocation_type NOT NULL DEFAULT 'none',
  level int NOT NULL DEFAULT 1,
  experience bigint NOT NULL DEFAULT 0,
  hp int NOT NULL DEFAULT 150,
  hp_max int NOT NULL DEFAULT 150,
  mana int NOT NULL DEFAULT 0,
  mana_max int NOT NULL DEFAULT 0,
  cap int NOT NULL DEFAULT 400,
  speed int NOT NULL DEFAULT 220,
  pos_x int NOT NULL DEFAULT 10,
  pos_y int NOT NULL DEFAULT 10,
  pos_z int NOT NULL DEFAULT 7,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX characters_name_lower_unique ON public.characters (lower(name));
CREATE INDEX characters_user_id_idx ON public.characters (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.characters TO authenticated;
GRANT ALL ON public.characters TO service_role;

ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own characters (select)"
ON public.characters FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own characters (insert)"
ON public.characters FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own characters (update)"
ON public.characters FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own characters (delete)"
ON public.characters FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Validação de nome
CREATE OR REPLACE FUNCTION public.validate_character_row_name()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.name IS NULL OR length(NEW.name) < 3 OR length(NEW.name) > 20 THEN
    RAISE EXCEPTION 'name must be 3 to 20 characters';
  END IF;
  IF NEW.name !~ '^[A-Za-z][A-Za-z ]*[A-Za-z]$' THEN
    RAISE EXCEPTION 'name may only contain letters and spaces';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_characters_validate_name
BEFORE INSERT OR UPDATE ON public.characters
FOR EACH ROW EXECUTE FUNCTION public.validate_character_row_name();

CREATE TRIGGER trg_characters_updated_at
BEFORE UPDATE ON public.characters
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
