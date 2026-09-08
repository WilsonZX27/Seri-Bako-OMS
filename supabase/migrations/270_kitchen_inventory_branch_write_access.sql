-- Kitchen users must be able to post operational inventory documents for the
-- Central Kitchen branches explicitly assigned to them. The staff editor used
-- to persist every non-company-wide assignment as read_only, which left GRN
-- posting visible but blocked at the inventory write boundary.
update public.staff_branches sb
set access_level = 'manage'::public.staff_access_level,
    updated_at = now()
from public.staffs s,
     public.branches b
where s.id = sb.staff_id
  and b.id = sb.branch_id
  and s.status = 'active'
  and s.deleted_at is null
  and b.status = 'active'
  and b.deleted_at is null
  and b.company_id = s.company_id
  and b.branch_type = 'central_kitchen'
  and exists (
    select 1
    from public.staff_roles sr
    join public.roles r on r.id = sr.role_id
    where sr.staff_id = s.id
      and r.role_code in ('kitchen', 'kitchen_staff')
      and r.status = 'active'
      and r.deleted_at is null
      and (sr.effective_from is null or sr.effective_from <= current_date)
      and (sr.effective_to is null or sr.effective_to >= current_date)
  );

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
    join public.branches b
      on b.id = new.branch_id
     and b.company_id = s.company_id
    join public.staff_roles sr on sr.staff_id = s.id
    join public.roles r on r.id = sr.role_id
    where s.id = new.staff_id
      and s.status = 'active'
      and s.deleted_at is null
      and b.branch_type = 'central_kitchen'
      and b.status = 'active'
      and b.deleted_at is null
      and r.role_code in ('kitchen', 'kitchen_staff')
      and r.status = 'active'
      and r.deleted_at is null
      and (sr.effective_from is null or sr.effective_from <= current_date)
      and (sr.effective_to is null or sr.effective_to >= current_date)
  ) then
    new.access_level := 'manage'::public.staff_access_level;
  end if;
  return new;
end $$;

drop trigger if exists enforce_kitchen_inventory_branch_write_access on public.staff_branches;
create trigger enforce_kitchen_inventory_branch_write_access
before insert or update of staff_id, branch_id, access_level
on public.staff_branches
for each row execute function public.enforce_kitchen_inventory_branch_write_access();

revoke all on function public.enforce_kitchen_inventory_branch_write_access() from public, anon, authenticated;

notify pgrst, 'reload schema';
