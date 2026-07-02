-- Sprint 7.1.1: schema stability fixes for upgraded production databases.
-- Older databases created attachments before Sprint 2.5 added storage metadata.

alter table public.attachments
  add column if not exists storage_path text,
  add column if not exists file_url text,
  add column if not exists status text not null default 'active',
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_by uuid,
  add column if not exists updated_by uuid;

create index if not exists attachments_entity_idx
  on public.attachments(entity_type, entity_id, status);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'attachments'
      and column_name = 'file_path'
  ) then
    alter table public.attachments alter column file_path drop not null;
  end if;
end $$;
