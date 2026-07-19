-- Manager is company-wide for operational PR visibility and Manager Review.
-- Staff branch assignments remain unchanged and continue to supply default context only.

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code = 'pr.view_all'
where r.role_code = 'manager' and r.status = 'active' and r.deleted_at is null
on conflict (role_id, permission_id) do nothing;

delete from public.role_permissions rp
using public.roles r, public.permissions p
where rp.role_id = r.id and rp.permission_id = p.id
  and r.role_code = 'manager'
  and p.permission_code in ('pr.view_branch', 'supplier_invoice.view');

update public.roles
set description = 'Company-wide operational review and approval; branch assignment supplies default context only.',
    updated_at = now()
where role_code = 'manager' and status = 'active' and deleted_at is null;

create or replace function public.can_access_purchase_request(
  target_company_id uuid,
  target_branch_id uuid,
  target_requested_by uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor public.staffs%rowtype;
begin
  select * into actor
  from public.staffs
  where auth_user_id = auth.uid()
    and status = 'active'
    and deleted_at is null
  limit 1;

  if actor.id is null or actor.company_id is distinct from target_company_id then
    return false;
  end if;

  if not public.has_any_permission(array['purchase_request.read', 'pr.view_all', 'pr.view_branch']) then
    return false;
  end if;

  if public.has_permission('pr.view_all') or exists (
    select 1
    from public.staff_roles sr
    join public.roles r on r.id = sr.role_id
    where sr.staff_id = actor.id
      and r.role_code = 'manager'
      and r.status = 'active' and r.deleted_at is null
      and sr.effective_from <= current_date
      and (sr.effective_to is null or sr.effective_to >= current_date)
  ) then
    return true;
  end if;

  return exists (
    select 1 from public.staff_branches sb
    where sb.staff_id = actor.id and sb.branch_id = target_branch_id
  );
end
$$;

revoke all on function public.can_access_purchase_request(uuid, uuid, uuid) from public, anon;
grant execute on function public.can_access_purchase_request(uuid, uuid, uuid) to authenticated;

-- Post-check:
-- select r.role_code, p.permission_code, count(*)
-- from public.role_permissions rp
-- join public.roles r on r.id = rp.role_id
-- join public.permissions p on p.id = rp.permission_id
-- where r.role_code = 'manager' and p.permission_code in ('pr.view_all', 'pr.view_branch')
-- group by r.role_code, p.permission_code;
