-- Keep an authenticated Owner recognisable while the staff access RPC replaces
-- that Owner's own role row. The inner function still owns tenant checks, last
-- Owner protection, branch validation, and the atomic replacement.
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
declare
  target_company_id uuid;
  selected_role_code text;
  actor_is_owner boolean;
begin
  select s.company_id into target_company_id
  from public.staffs s
  where s.id = p_staff_id and s.deleted_at is null;
  if target_company_id is null then
    raise exception 'Target staff was not found in your company.' using errcode = '42501';
  end if;

  perform 1 from public.companies c where c.id = target_company_id for update;
  select r.role_code into selected_role_code
  from public.roles r
  where r.id = p_role_id and r.company_id = target_company_id
    and r.status = 'active' and r.deleted_at is null;
  actor_is_owner := public.current_staff_has_company_role(array['super_admin']);

  if selected_role_code = 'super_admin' and actor_is_owner then
    perform set_config('seri_bako.bootstrap_owner_assignment', 'authorized', true);
  end if;

  return public.replace_staff_access_atomic_unlocked(
    p_staff_id, p_role_id, p_default_branch_id, p_accessible_branch_ids,
    p_status, p_staff_code, p_full_name, p_email, p_phone
  );
end;
$$;

revoke all on function public.replace_staff_access_atomic(
  uuid, uuid, uuid, uuid[], public.record_status, text, text, text, text
) from public, anon;
grant execute on function public.replace_staff_access_atomic(
  uuid, uuid, uuid, uuid[], public.record_status, text, text, text, text
) to authenticated;

-- Records before this release are historical. They were completed before the
-- controlled posting step existed, so close them with their existing editor as
-- reviewer and retain a per-record audit entry.
with posted as (
  update public.outlet_daily_records record
  set status = 'reviewed',
      reviewed_by = coalesce(record.reviewed_by, record.updated_by, record.created_by),
      reviewed_at = coalesce(record.reviewed_at, record.updated_at, record.created_at),
      updated_at = now()
  where record.status = 'evening_completed'
    and record.record_date < date '2026-09-05'
  returning record.id, record.company_id,
    coalesce(record.reviewed_by, record.updated_by, record.created_by) as actor_id,
    record.record_date
)
insert into public.activity_logs (
  company_id, entity_type, entity_id, activity_type, message, metadata, created_by
)
select posted.company_id, 'outlet_daily_record', posted.id, 'posted',
  'Historical outlet daily record closed during controlled-posting rollout',
  jsonb_build_object('record_date', posted.record_date, 'migration', 264),
  posted.actor_id
from posted
where posted.actor_id is not null;

notify pgrst, 'reload schema';
