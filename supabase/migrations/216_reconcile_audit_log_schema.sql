-- Reconcile the two historical audit-log shapes. Migration 004 created
-- old_data/new_data while migration 008 and the application established
-- old_values/new_values as the canonical contract. Fresh resets and upgraded
-- databases must expose the same columns without discarding legacy evidence.

alter table public.audit_logs
  add column if not exists entity_type text,
  add column if not exists entity_id uuid,
  add column if not exists old_values jsonb,
  add column if not exists new_values jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists created_by uuid references public.staffs(id) on delete set null;

update public.audit_logs
set entity_type = coalesce(nullif(trim(entity_type), ''), nullif(trim(table_name), ''), 'legacy_audit'),
    entity_id = coalesce(entity_id, record_id, company_id, id),
    old_values = coalesce(old_values, old_data),
    new_values = coalesce(new_values, new_data),
    created_at = coalesce(created_at, changed_at, now()),
    created_by = coalesce(created_by, changed_by)
where entity_type is null
   or nullif(trim(entity_type), '') is null
   or entity_id is null
   or (old_values is null and old_data is not null)
   or (new_values is null and new_data is not null)
   or created_by is null;

alter table public.audit_logs
  alter column entity_type set not null,
  alter column entity_id set not null,
  alter column created_at set not null;

create index if not exists audit_logs_entity_created_idx
  on public.audit_logs(company_id, entity_type, entity_id, created_at desc);

revoke insert, update, delete on public.audit_logs from anon;
grant select, insert on public.audit_logs to authenticated;
