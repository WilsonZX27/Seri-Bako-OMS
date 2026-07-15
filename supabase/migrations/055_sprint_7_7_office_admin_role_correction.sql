-- Sprint 7.7: only the owner role has implicit full access.
-- This deliberately preserves staff_roles and staff_permission_overrides.

update public.roles
set role_name = 'Administrator',
    description = 'Office administration and data-entry access. Owner controls remain restricted.'
where role_code in ('admin', 'operations_admin');

-- Replace the legacy full-access defaults with clerical operational defaults.
delete from public.role_permissions rp
using public.roles r
where rp.role_id = r.id and r.role_code in ('admin', 'operations_admin');

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code = any (array[
  'dashboard.view', 'staffs.read', 'items.create', 'items.update',
  'suppliers.create', 'suppliers.update', 'supplier_items.create', 'supplier_items.update',
  'pr.create', 'pr.submit', 'pr.admin_review', 'pr.reject', 'pr.cancel', 'pr.view_all', 'pr.view_branch',
  'po.create', 'po.submit', 'po.send', 'grn.create',
  'purchase_return.view', 'purchase_return.create', 'purchase_return.cancel',
  'supplier_invoice.view', 'supplier_invoice.create',
  'attachments.upload', 'imports.run', 'documents.view', 'reports.view',
  'stock.view', 'stock_transactions.read', 'stock_ledger.export',
  'branches.read', 'branches.create', 'branches.update', 'locations.read', 'locations.create', 'locations.update'
])
where r.role_code in ('admin', 'operations_admin')
on conflict (role_id, permission_id) do nothing;

create or replace function public.has_any_permission(permission_codes text[])
returns boolean
language sql stable security definer set search_path = public
as $$
  with actor as (
    select s.id from public.staffs s
    where s.auth_user_id = auth.uid() and s.status = 'active' and s.deleted_at is null limit 1
  ), active_roles as (
    select r.id, r.role_code from actor a
    join public.staff_roles sr on sr.staff_id = a.id
    join public.roles r on r.id = sr.role_id and r.status = 'active' and r.deleted_at is null
    where (sr.effective_from is null or sr.effective_from <= current_date)
      and (sr.effective_to is null or sr.effective_to >= current_date)
  ), override_effect as (
    select spo.effect from actor a
    join public.staff_permission_overrides spo on spo.staff_id = a.id
    join public.permissions p on p.id = spo.permission_id
    where p.permission_code = any(permission_codes)
  )
  select case
    when exists (select 1 from active_roles where role_code = 'super_admin') then true
    when exists (select 1 from override_effect where effect = 'deny') then false
    when exists (select 1 from override_effect where effect = 'allow') then true
    else exists (
      select 1 from active_roles ar join public.role_permissions rp on rp.role_id = ar.id
      join public.permissions p on p.id = rp.permission_id where p.permission_code = any(permission_codes)
    )
  end
$$;

create or replace function public.set_staff_permission_overrides(target_staff_id uuid, overrides jsonb)
returns void language plpgsql security definer set search_path = public
as $$
declare actor_staff public.staffs%rowtype; target_staff public.staffs%rowtype; item jsonb;
  permission_row public.permissions%rowtype; effect_value text;
begin
  select * into actor_staff from public.staffs where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor_staff.id is null or not public.has_permission('roles.update') then raise exception 'Missing permission: roles.update'; end if;
  select * into target_staff from public.staffs where id = target_staff_id and deleted_at is null;
  if target_staff.id is null or target_staff.company_id <> actor_staff.company_id then raise exception 'Staff member was not found in your company.'; end if;
  if exists (select 1 from public.staff_roles sr join public.roles r on r.id = sr.role_id
    where sr.staff_id = target_staff_id and r.role_code = 'super_admin' and r.status = 'active'
      and (sr.effective_from is null or sr.effective_from <= current_date) and (sr.effective_to is null or sr.effective_to >= current_date))
  then raise exception 'Super Admin / Owner permissions cannot be overridden.'; end if;
  delete from public.staff_permission_overrides where staff_id = target_staff_id;
  for item in select value from jsonb_array_elements(coalesce(overrides, '[]'::jsonb)) loop
    effect_value := item ->> 'effect';
    if effect_value not in ('allow', 'deny') then raise exception 'Permission override effect must be allow or deny.'; end if;
    select * into permission_row from public.permissions where id = (item ->> 'permission_id')::uuid;
    if permission_row.id is null then raise exception 'Permission was not found.'; end if;
    if target_staff_id = actor_staff.id and effect_value = 'deny' and permission_row.permission_code in ('roles.update', 'users.manage') then raise exception 'You cannot remove your own permission-management access.'; end if;
    if effect_value = 'allow' and not public.has_permission(permission_row.permission_code) then raise exception 'You cannot grant a permission you do not have: %', permission_row.permission_code; end if;
    insert into public.staff_permission_overrides (staff_id, permission_id, effect, created_by, updated_by)
    values (target_staff_id, permission_row.id, effect_value, actor_staff.id, actor_staff.id);
  end loop;
end
$$;
