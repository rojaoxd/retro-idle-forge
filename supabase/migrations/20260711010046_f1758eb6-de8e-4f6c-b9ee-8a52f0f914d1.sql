DROP INDEX IF EXISTS public.idx_otserv_wtiles_zxy;
DROP INDEX IF EXISTS public.idx_otserv_wtiles_house;
ALTER TABLE public.otserv_world_tiles DROP CONSTRAINT IF EXISTS otserv_world_tiles_x_y_z_key;
TRUNCATE TABLE public.otserv_world_tiles;