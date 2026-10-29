\set ON_ERROR_STOP on
CREATE TABLE public.companies(id uuid primary key, company_name text not null);
INSERT INTO public.companies VALUES('11111111-1111-4111-8111-111111111111','Example A'),('22222222-2222-4222-8222-222222222222','Example B');
CREATE TEMP TABLE before_company AS SELECT * FROM public.companies;
-- PROPOSED ONLY. No installation/permission changes have been executed.
-- Nullable, backwards-compatible presentation metadata; existing company RLS/ACL unchanged.
BEGIN;
ALTER TABLE public.companies ADD COLUMN ui_theme jsonb;
ALTER TABLE public.companies ADD CONSTRAINT companies_ui_theme_valid CHECK (
 ui_theme IS NULL OR COALESCE((
 jsonb_typeof(ui_theme)='object' AND jsonb_typeof(ui_theme->'version')='number' AND ui_theme->>'version'='1'
 AND jsonb_typeof(ui_theme->'primary')='string' AND ui_theme->>'primary' ~ '^#[0-9A-Fa-f]{6}$'
 AND ui_theme - 'version' - 'primary' = '{}'::jsonb
 ),false));
COMMIT;
-- Before activation verify current company RLS/ACL allow reads only in the actor's company,
-- and existing company UPDATE policies restrict owners. Stop on metadata drift.
-- Restore before use: drop the new constraint/column in a reviewed transaction.
-- After use: prefer resetting theme to NULL; do not discard company preferences blindly.

DO $test$
DECLARE bad jsonb;
BEGIN
 FOREACH bad IN ARRAY ARRAY['{}'::jsonb,'{"version":1}'::jsonb,'{"primary":"#ffffff"}'::jsonb,'{"version":"1","primary":"#ffffff"}'::jsonb,'{"version":1,"primary":"red"}'::jsonb,'{"version":1,"primary":null}'::jsonb,'{"version":1,"primary":"#ffffff","extra":1}'::jsonb,'[]'::jsonb] LOOP
  BEGIN
   UPDATE public.companies SET ui_theme=bad WHERE company_name='Example A';
   RAISE EXCEPTION 'Invalid theme accepted: %',bad;
  EXCEPTION WHEN check_violation THEN NULL;
  END;
 END LOOP;
 UPDATE public.companies SET ui_theme='{"version":1,"primary":"#624399"}' WHERE company_name='Example A';
 IF (SELECT ui_theme IS NOT NULL FROM public.companies WHERE company_name='Example B') THEN RAISE EXCEPTION 'Other company changed'; END IF;
 UPDATE public.companies SET ui_theme=NULL WHERE company_name='Example A';
 IF EXISTS((SELECT id,company_name FROM public.companies) EXCEPT (SELECT * FROM before_company)) THEN RAISE EXCEPTION 'Company identity changed'; END IF;
 RAISE NOTICE 'PASS: nullable compatibility, eight invalid JSON cases, valid palette, other company unchanged, default reset, original identity retained';
END $test$;
BEGIN;
ALTER TABLE public.companies DROP CONSTRAINT companies_ui_theme_valid;
ALTER TABLE public.companies DROP COLUMN ui_theme;
COMMIT;
DO $$BEGIN IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='ui_theme') THEN RAISE EXCEPTION 'Rollback incomplete'; END IF; RAISE NOTICE 'PASS: isolated pre-use schema rollback'; END$$;
