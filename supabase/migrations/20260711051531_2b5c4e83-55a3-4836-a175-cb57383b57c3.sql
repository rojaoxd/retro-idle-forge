
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS engine_data jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.characters.engine_data IS
  'Estado completo do personagem no formato do engine Tibia74 (fonte de verdade). Colunas resumidas são atualizadas a partir daqui a cada save.';
