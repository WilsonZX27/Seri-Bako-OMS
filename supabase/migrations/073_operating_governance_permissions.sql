-- Sprint 7.23.5: align operating governance without changing business records.

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on (
  (r.role_code = 'finance' and p.permission_code in (
    'staffs.read', 'staffs.create', 'staffs.update',
    'document_sequences.read', 'document_sequences.create', 'document_sequences.update',
    'imports.create', 'branches.read', 'branches.create', 'branches.update'
  ))
  or (r.role_code = 'manager' and p.permission_code in ('branches.read', 'branches.create', 'branches.update'))
  or (r.role_code in ('super_admin', 'purchasing', 'kitchen', 'outlet_staff') and p.permission_code = 'branches.read')
)
where r.status = 'active' and r.deleted_at is null
on conflict (role_id, permission_id) do nothing;

delete from public.role_permissions rp
using public.roles r, public.permissions p
where rp.role_id = r.id and rp.permission_id = p.id
  and (
    (r.role_code = 'finance' and p.permission_code in ('settings.manage', 'company.update', 'roles.create', 'roles.update', 'locations.create', 'locations.update'))
    or (r.role_code = 'manager' and p.permission_code in ('settings.manage', 'company.update', 'staffs.create', 'staffs.update', 'roles.create', 'roles.update', 'document_sequences.create', 'document_sequences.update', 'imports.create', 'locations.create', 'locations.update'))
    or (r.role_code = 'purchasing' and p.permission_code in ('settings.manage', 'company.update', 'staffs.create', 'staffs.update', 'roles.create', 'roles.update', 'document_sequences.create', 'document_sequences.update', 'branches.create', 'branches.update', 'locations.create', 'locations.update'))
    or (r.role_code in ('kitchen', 'outlet_staff') and p.permission_code in ('settings.manage', 'company.update', 'staffs.create', 'staffs.update', 'roles.create', 'roles.update', 'document_sequences.create', 'document_sequences.update', 'imports.create', 'branches.create', 'branches.update', 'locations.create', 'locations.update'))
  );

create or replace function public.current_staff_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.company_id from public.staffs s
  where s.auth_user_id = auth.uid() and s.status = 'active' and s.deleted_at is null
  limit 1
$$;

create or replace function public.current_staff_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staffs s
    join public.staff_roles sr on sr.staff_id = s.id
    join public.roles r on r.id = sr.role_id
    where s.auth_user_id = auth.uid() and s.status = 'active' and s.deleted_at is null
      and r.role_code = 'super_admin' and r.status = 'active' and r.deleted_at is null
      and sr.effective_from <= current_date and (sr.effective_to is null or sr.effective_to >= current_date)
  )
$$;

create or replace function public.staff_is_protected_owner(target_staff_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_roles sr
    join public.roles r on r.id = sr.role_id
    where sr.staff_id = target_staff_id and r.role_code = 'super_admin'
      and r.status = 'active' and r.deleted_at is null
      and sr.effective_from <= current_date and (sr.effective_to is null or sr.effective_to >= current_date)
  )
$$;

drop policy if exists "staffs read" on public.staffs;
drop policy if exists "staffs admin manage" on public.staffs;
create policy "staffs scoped read" on public.staffs for select to authenticated
using (
  company_id = public.current_staff_company_id()
  and (auth_user_id = auth.uid() or public.has_permission('staffs.read'))
);
create policy "staffs scoped insert" on public.staffs for insert to authenticated
with check (company_id = public.current_staff_company_id() and public.has_permission('staffs.create'));
create policy "staffs scoped update" on public.staffs for update to authenticated
using (
  company_id = public.current_staff_company_id() and public.has_permission('staffs.update')
  and (public.current_staff_is_owner() or not public.staff_is_protected_owner(id))
)
with check (
  company_id = public.current_staff_company_id() and public.has_permission('staffs.update')
  and (public.current_staff_is_owner() or not public.staff_is_protected_owner(id))
);

drop policy if exists "staff roles admin manage" on public.staff_roles;
drop policy if exists "staff_roles read" on public.staff_roles;
create policy "staff roles scoped read" on public.staff_roles for select to authenticated
using (exists (
  select 1 from public.staffs target
  where target.id = staff_roles.staff_id
    and target.company_id = public.current_staff_company_id()
    and (target.auth_user_id = auth.uid() or public.has_permission('staffs.read'))
));
create policy "staff roles scoped manage" on public.staff_roles for all to authenticated
using (
  public.has_permission('staffs.update')
  and exists (select 1 from public.staffs target where target.id = staff_roles.staff_id and target.company_id = public.current_staff_company_id())
  and (public.current_staff_is_owner() or not public.staff_is_protected_owner(staff_id))
)
with check (
  public.has_permission('staffs.update')
  and exists (select 1 from public.staffs target where target.id = staff_roles.staff_id and target.company_id = public.current_staff_company_id())
  and (
    public.current_staff_is_owner()
    or (
      not public.staff_is_protected_owner(staff_id)
      and not exists (select 1 from public.roles r where r.id = staff_roles.role_id and r.role_code = 'super_admin')
    )
  )
);

drop policy if exists "staff branches admin manage" on public.staff_branches;
drop policy if exists "staff_branches read" on public.staff_branches;
create policy "staff branches scoped read" on public.staff_branches for select to authenticated
using (exists (
  select 1 from public.staffs target
  where target.id = staff_branches.staff_id
    and target.company_id = public.current_staff_company_id()
    and (target.auth_user_id = auth.uid() or public.has_permission('staffs.read'))
));
create policy "staff branches scoped manage" on public.staff_branches for all to authenticated
using (
  public.has_permission('staffs.update')
  and exists (select 1 from public.staffs target where target.id = staff_branches.staff_id and target.company_id = public.current_staff_company_id())
  and (public.current_staff_is_owner() or not public.staff_is_protected_owner(staff_id))
)
with check (
  public.has_permission('staffs.update')
  and exists (select 1 from public.staffs target where target.id = staff_branches.staff_id and target.company_id = public.current_staff_company_id())
  and (public.current_staff_is_owner() or not public.staff_is_protected_owner(staff_id))
);

drop policy if exists "staff locations admin manage" on public.staff_locations;
drop policy if exists "staff_locations read" on public.staff_locations;
create policy "staff scope compatibility read" on public.staff_locations for select to authenticated
using (exists (
  select 1 from public.staffs target
  where target.id = staff_locations.staff_id
    and target.company_id = public.current_staff_company_id()
    and (target.auth_user_id = auth.uid() or public.has_permission('staffs.read'))
));
create policy "staff scope compatibility manage" on public.staff_locations for all to authenticated
using (
  public.has_permission('staffs.update')
  and exists (select 1 from public.staffs target where target.id = staff_locations.staff_id and target.company_id = public.current_staff_company_id())
  and (public.current_staff_is_owner() or not public.staff_is_protected_owner(staff_id))
)
with check (
  public.has_permission('staffs.update')
  and exists (select 1 from public.staffs target where target.id = staff_locations.staff_id and target.company_id = public.current_staff_company_id())
  and (public.current_staff_is_owner() or not public.staff_is_protected_owner(staff_id))
);

drop policy if exists "branches read" on public.branches;
drop policy if exists "branches admin manage" on public.branches;
create policy "branches scoped read" on public.branches for select to authenticated
using (company_id = public.current_staff_company_id() and public.has_permission('branches.read'));
create policy "branches scoped insert" on public.branches for insert to authenticated
with check (company_id = public.current_staff_company_id() and public.has_permission('branches.create'));
create policy "branches scoped update" on public.branches for update to authenticated
using (company_id = public.current_staff_company_id() and public.has_permission('branches.update'))
with check (company_id = public.current_staff_company_id() and public.has_permission('branches.update'));

drop policy if exists "document_sequences read" on public.document_sequences;
drop policy if exists "document sequences admin manage" on public.document_sequences;
create policy "document sequences scoped read" on public.document_sequences for select to authenticated
using (company_id = public.current_staff_company_id() and public.has_permission('document_sequences.read'));
create policy "document sequences scoped insert" on public.document_sequences for insert to authenticated
with check (company_id = public.current_staff_company_id() and public.has_permission('document_sequences.create'));
create policy "document sequences scoped update" on public.document_sequences for update to authenticated
using (company_id = public.current_staff_company_id() and public.has_permission('document_sequences.update'))
with check (company_id = public.current_staff_company_id() and public.has_permission('document_sequences.update'));

revoke all on function public.current_staff_company_id() from public, anon;
revoke all on function public.current_staff_is_owner() from public, anon;
revoke all on function public.staff_is_protected_owner(uuid) from public, anon;
grant execute on function public.current_staff_company_id() to authenticated;
grant execute on function public.current_staff_is_owner() to authenticated;
grant execute on function public.staff_is_protected_owner(uuid) to authenticated;
grant select, insert, update, delete on table public.staff_roles to authenticated;
grant select, insert, update, delete on table public.staff_branches to authenticated;
grant select, insert, update, delete on table public.staff_locations to authenticated;

-- Post-check (run after reset):
-- select r.role_code, array_agg(p.permission_code order by p.permission_code)
-- from public.roles r join public.role_permissions rp on rp.role_id = r.id
-- join public.permissions p on p.id = rp.permission_id
-- where r.role_code in ('finance','manager','purchasing','kitchen','outlet_staff')
--   and (p.permission_code like 'staffs.%' or p.permission_code like 'branches.%'
--     or p.permission_code like 'document_sequences.%' or p.permission_code in ('imports.create','settings.manage'))
-- group by r.role_code order by r.role_code;
