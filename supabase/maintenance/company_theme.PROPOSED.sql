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
