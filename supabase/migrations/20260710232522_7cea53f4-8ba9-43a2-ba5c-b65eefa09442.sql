
-- Deduplicate sprites by hash + reserve client_id per kind

CREATE UNIQUE INDEX IF NOT EXISTS game_sprites_hash_unique
  ON public.game_sprites (hash)
  WHERE hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS game_objects_kind_client_id_unique
  ON public.game_objects (object_kind, client_id)
  WHERE client_id IS NOT NULL;
