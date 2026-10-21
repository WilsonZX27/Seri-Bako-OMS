begin;

-- Preserve the former Kitchen capabilities on Chef before reducing Kitchen.
insert into public.role_permissions(role_id, permission_id)
select chef.id, rp.permission_id
from public.roles chef
join public.roles kitchen
  on kitchen.company_id = chef.company_id
 and kitchen.role_code = 'kitchen'
join public.role_permissions rp on rp.role_id = kitchen.id
where chef.role_code = 'chef'
  and chef.status = 'active' and chef.deleted_at is null
  and kitchen.status = 'active' and kitchen.deleted_at is null
on conflict (role_id, permission_id) do nothing;

-- Transfer the two explicitly identified staff records to Chef. Fail the
-- migration if a code is missing/ambiguous or is not attached to a kitchen.
do $$
declare
  target_code text;
  target_id uuid;
  target_company uuid;
  default_branch uuid;
  chef_role uuid;
  matches integer;
begin
  foreach target_code in array array['5', '57'] loop
    select count(*) into matches
    from public.staffs s
    where s.staff_code = target_code
      and s.status = 'active' and s.deleted_at is null;
    if matches <> 1 then
      raise exception 'Expected exactly one active staff record for Staff Code %, found %.', target_code, matches;
    end if;

    select s.id, s.company_id, s.default_branch_id
      into target_id, target_company, default_branch
    from public.staffs s
    where s.staff_code = target_code
      and s.status = 'active' and s.deleted_at is null;

    if default_branch is null or not exists (
      select 1 from public.branches b
      where b.id = default_branch and b.company_id = target_company
        and b.branch_type = 'central_kitchen'
        and b.status = 'active' and b.deleted_at is null
    ) then
      raise exception 'Staff Code % must have an active Central Kitchen default branch before Chef assignment.', target_code;
    end if;

    if exists (
      select 1 from public.staff_branches sb
      join public.branches b on b.id = sb.branch_id and b.company_id = target_company
      where sb.staff_id = target_id and b.branch_type <> 'central_kitchen'
    ) then
      raise exception 'Staff Code % has an assigned non-kitchen branch; review access before Chef assignment.', target_code;
    end if;

    select r.id into chef_role from public.roles r
    where r.company_id = target_company and r.role_code = 'chef'
      and r.status = 'active' and r.deleted_at is null;
    if chef_role is null then
      raise exception 'Active Chef role is missing for Staff Code %.', target_code;
    end if;

    delete from public.staff_roles where staff_id = target_id;
    insert into public.staff_roles(staff_id, role_id, branch_id, is_primary, effective_from, effective_to)
    values (target_id, chef_role, default_branch, true, current_date, null);
  end loop;
end $$;

-- Kitchen keeps only checklist access and dashboard access needed by its
-- personal workspace. Published schedule and payroll views use self-scoped
-- server queries and do not grant schedule-management permissions.
delete from public.role_permissions rp
using public.roles r, public.permissions p
where rp.role_id = r.id and rp.permission_id = p.id
  and r.role_code = 'kitchen' and r.status = 'active' and r.deleted_at is null
  and p.permission_code not in ('assets.view', 'assets.check', 'dashboard.view');

-- The old Kitchen trigger granted inventory-management branch access. Keep
-- that behavior only for Chef; Kitchen access remains read-only for its
-- assigned asset-check locations.
create or replace function public.asset_location_access(p_location uuid) returns boolean
language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select 1 from public.asset_locations l
 where l.id=p_location and l.company_id=public.current_staff_company_id()
 and public.asset_company_live(l.company_id) and public.has_permission('assets.view')
 and (public.current_staff_has_company_role(array['super_admin']) or
 (l.kind='branch' and exists(select 1 from public.staffs s
 where s.id=public.current_staff_id() and s.company_id=l.company_id
 and (s.default_branch_id=l.branch_id or exists(select 1 from public.staff_branches sb where sb.staff_id=s.id and sb.branch_id=l.branch_id))))))
$$;

-- The RPC is shared with manager views, so its employee path must return only
-- assigned locations and must not expose company-wide counts or maintenance.
create or replace function public.get_asset_checklist_summary(p_date date default (now() at time zone 'Asia/Kuala_Lumpur')::date) returns jsonb
language sql stable security invoker set search_path=pg_catalog,public as $$
 select jsonb_build_object('checkDate',p_date,'checklist',coalesce((select jsonb_agg(jsonb_build_object(
 'id',l.id,'name',l.source_name,'kind',l.kind,
 'open',coalesce((select d.is_open from public.asset_calendar_days d where d.location_id=l.id and d.business_date=p_date),l.kind='branch'),
 'reason',(select d.reason from public.asset_calendar_days d where d.location_id=l.id and d.business_date=p_date),
 'expected',(select count(*) from public.asset_holdings h where h.location_id=l.id and (h.quantity is null or h.quantity>0)),
 'checked',(select count(*) from public.asset_holdings h where h.location_id=l.id and (h.quantity is null or h.quantity>0) and exists(select 1 from public.asset_daily_checks c where c.location_id=l.id and c.asset_id=h.asset_id and c.check_date=p_date))) order by l.source_name) from public.asset_locations l where public.asset_location_access(l.id)),'[]'::jsonb))
$$;

-- Holders only see assets attached to an assigned location, even if they have
-- other permitted locations. This prevents IDs, counts and transfer history
-- elsewhere in the tenant from being inferred from the asset tables.
alter policy assets_read on public.assets using (
 company_id=(select public.current_staff_company_id())
 and (select public.asset_company_live(public.current_staff_company_id()))
 and (select public.has_permission('assets.view'))
 and ((select public.current_staff_has_company_role(array['super_admin']))
 or exists(select 1 from public.asset_holdings h where h.asset_id=assets.id and public.asset_location_access(h.location_id))
 or exists(select 1 from public.asset_transfers t where t.asset_id=assets.id and (public.asset_location_access(t.from_location_id) or public.asset_location_access(t.to_location_id))))
);

insert into public.role_permissions(role_id, permission_id)
select chef.id, p.id
from public.roles chef
join public.permissions p on p.permission_code in ('schedule.read', 'schedule.request')
where chef.role_code = 'chef' and chef.status = 'active' and chef.deleted_at is null
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions(role_id, permission_id)
select kitchen.id, p.id
from public.roles kitchen
join public.permissions p on p.permission_code = 'schedule.read'
where kitchen.role_code = 'kitchen' and kitchen.status = 'active' and kitchen.deleted_at is null
on conflict (role_id, permission_id) do nothing;

create or replace function public.enforce_kitchen_inventory_branch_write_access()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if exists (
    select 1
    from public.staffs s
    join public.branches b on b.id = new.branch_id and b.company_id = s.company_id
    join public.staff_roles sr on sr.staff_id = s.id
    join public.roles r on r.id = sr.role_id
    where s.id = new.staff_id
      and s.status = 'active' and s.deleted_at is null
      and b.branch_type = 'central_kitchen'
      and b.status = 'active' and b.deleted_at is null
      and r.role_code = 'chef'
      and r.status = 'active' and r.deleted_at is null
      and (sr.effective_from is null or sr.effective_from <= current_date)
      and (sr.effective_to is null or sr.effective_to >= current_date)
  ) then
    new.access_level := 'manage'::public.staff_access_level;
  end if;
  return new;
end $$;

revoke all on function public.enforce_kitchen_inventory_branch_write_access() from public, anon, authenticated;

-- Remove inherited write-level branch flags from remaining Kitchen users.
update public.staff_branches sb
set access_level = 'read_only'::public.staff_access_level,
    updated_at = now()
where sb.access_level = 'manage'::public.staff_access_level
  and exists (
    select 1 from public.staff_roles sr
    join public.roles r on r.id = sr.role_id
    where sr.staff_id = sb.staff_id
      and r.role_code = 'kitchen' and r.status = 'active' and r.deleted_at is null
      and (sr.effective_from is null or sr.effective_from <= current_date)
      and (sr.effective_to is null or sr.effective_to >= current_date)
  );

notify pgrst, 'reload schema';
commit;
