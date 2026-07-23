-- Serialize every supported Owner-removal RPC on the target company row.
-- Migration 082 remains immutable; these wrappers lock before delegating to
-- the existing authorization, invariant, assignment, and audit logic.

alter function public.replace_staff_access_atomic(
  uuid, uuid, uuid, uuid[], public.record_status, text, text, text, text
) rename to replace_staff_access_atomic_unlocked;
alter function public.set_staff_status_atomic(uuid, public.record_status)
  rename to set_staff_status_atomic_unlocked;

revoke all on function public.replace_staff_access_atomic_unlocked(
  uuid, uuid, uuid, uuid[], public.record_status, text, text, text, text
) from public, anon, authenticated;
revoke all on function public.set_staff_status_atomic_unlocked(uuid, public.record_status)
  from public, anon, authenticated;

create or replace function public.replace_staff_access_atomic(
  p_staff_id uuid,
  p_role_id uuid,
  p_default_branch_id uuid,
  p_accessible_branch_ids uuid[] default '{}'::uuid[],
  p_status public.record_status default null,
  p_staff_code text default null,
  p_full_name text default null,
  p_email text default null,
  p_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare target_company_id uuid;
begin
  select s.company_id into target_company_id
  from public.staffs s
  where s.id = p_staff_id and s.deleted_at is null;
  if target_company_id is null then
    raise exception 'Target staff was not found in your company.' using errcode = '42501';
  end if;
  perform 1 from public.companies c where c.id = target_company_id for update;
  return public.replace_staff_access_atomic_unlocked(
    p_staff_id, p_role_id, p_default_branch_id, p_accessible_branch_ids,
    p_status, p_staff_code, p_full_name, p_email, p_phone
  );
end;
$$;

create or replace function public.set_staff_status_atomic(
  p_staff_id uuid,
  p_status public.record_status
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare target_company_id uuid;
begin
  select s.company_id into target_company_id
  from public.staffs s
  where s.id = p_staff_id and s.deleted_at is null;
  if target_company_id is null then
    raise exception 'Target staff was not found in your company.' using errcode = '42501';
  end if;
  perform 1 from public.companies c where c.id = target_company_id for update;
  perform public.set_staff_status_atomic_unlocked(p_staff_id, p_status);
end;
$$;

revoke all on function public.replace_staff_access_atomic(
  uuid, uuid, uuid, uuid[], public.record_status, text, text, text, text
) from public, anon;
grant execute on function public.replace_staff_access_atomic(
  uuid, uuid, uuid, uuid[], public.record_status, text, text, text, text
) to authenticated;
revoke all on function public.set_staff_status_atomic(uuid, public.record_status)
  from public, anon;
grant execute on function public.set_staff_status_atomic(uuid, public.record_status)
  to authenticated;
