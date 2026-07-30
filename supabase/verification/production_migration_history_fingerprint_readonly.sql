-- Run manually in Supabase Dashboard SQL Editor.
-- This script returns fingerprints only; it never returns migration SQL text.

begin transaction read only;

select current_setting('transaction_read_only') as transaction_read_only;

with migration_statements as (
  select
    migration.version,
    statement.ordinality,
    statement.sql_text,
    regexp_replace(
      trim(replace(statement.sql_text, chr(13), '')),
      '[[:space:]]+',
      ' ',
      'g'
    ) as normalized_sql
  from supabase_migrations.schema_migrations migration
  cross join lateral unnest(migration.statements)
    with ordinality as statement(sql_text, ordinality)
  where migration.version in ('110', '111', '112')
)
select
  version,
  count(*) as statement_count,
  sum(length(sql_text)) as raw_character_count,
  md5(
    string_agg(
      sql_text,
      E'\n-- SUPABASE STATEMENT BOUNDARY --\n'
      order by ordinality
    )
  ) as raw_statement_fingerprint,
  md5(
    string_agg(
      normalized_sql,
      E'\n-- SUPABASE STATEMENT BOUNDARY --\n'
      order by ordinality
    )
  ) as normalized_statement_fingerprint
from migration_statements
group by version
order by version;

rollback;

-- Run this separate read-only transaction only when an aggregate fingerprint
-- mismatch requires statement-level localization. It returns hashes and
-- lengths, never statement text.
begin transaction read only;

select
  migration.version,
  statement.ordinality,
  length(statement.sql_text) as raw_length,
  md5(statement.sql_text) as raw_fingerprint,
  md5(
    regexp_replace(
      trim(replace(statement.sql_text, chr(13), '')),
      '[[:space:]]+',
      ' ',
      'g'
    )
  ) as normalized_fingerprint
from supabase_migrations.schema_migrations migration
cross join lateral unnest(migration.statements)
  with ordinality as statement(sql_text, ordinality)
where migration.version in ('110', '111', '112')
order by migration.version, statement.ordinality;

rollback;
