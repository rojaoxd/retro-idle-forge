-- Wipe entire public schema and all auth users for a fresh start
DO $$
DECLARE r RECORD;
BEGIN
  -- Drop all tables in public
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname='public') LOOP
    EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;

  -- Drop all views
  FOR r IN (SELECT viewname FROM pg_views WHERE schemaname='public') LOOP
    EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(r.viewname) || ' CASCADE';
  END LOOP;

  -- Drop all materialized views
  FOR r IN (SELECT matviewname FROM pg_matviews WHERE schemaname='public') LOOP
    EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS public.' || quote_ident(r.matviewname) || ' CASCADE';
  END LOOP;

  -- Drop all functions/procedures in public
  FOR r IN (
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
  ) LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
  END LOOP;

  -- Drop all enums / composite types in public
  FOR r IN (
    SELECT t.typname
    FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' AND t.typtype IN ('e','c','d')
      AND NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.reltype = t.oid)
  ) LOOP
    EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
  END LOOP;
END $$;

-- Remove any trigger on auth.users left over from previous project
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Delete all auth users (cascades to identities/sessions)
DELETE FROM auth.users;