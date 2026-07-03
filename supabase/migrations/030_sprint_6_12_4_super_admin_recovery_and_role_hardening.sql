-- Sprint 6.12.4 Super Admin Recovery and Role Hardening
-- Note: migration number 028 is already used in this repo by Sprint 6.12.2,
-- so this recovery runs as the next ordered migration.

do $$
declare
  wilson_staff_id uuid;
  wilson_company_id uuid;
  owner_role_id uuid;
begin
  select s.id, s.company_id
    into wilson_staff_id, wilson_company_id
  from public.staffs s
  where lower(coalesce(s.email, s.invite_email, '')) = 'wilson@seribako.com.my'
     or s.staff_code = 'SUPER-ADMIN'
  order by case when s.staff_code = 'SUPER-ADMIN' then 0 else 1 end, s.created_at
  limit 1;

  if wilson_staff_id is null then
    raise notice 'Wilson Super Admin staff profile was not found. Recovery skipped.';
    return;
  end if;

  insert into public.roles (company_id, role_code, role_name, description, status)
  values (
    wilson_company_id,
    'super_admin',
    'Super Admin / Owner',
    'Protected system owner role with full permissions',
    'active'
  )
  on conflict (company_id, role_code) do update
    set role_name = excluded.role_name,
        description = excluded.description,
        status = 'active',
        deleted_at = null;

  select id
    into owner_role_id
  from public.roles
  where company_id = wilson_company_id
    and role_code = 'super_admin'
  limit 1;

  update public.staffs
     set staff_code = coalesce(nullif(staff_code, ''), 'SUPER-ADMIN'),
         full_name = coalesce(nullif(full_name, ''), 'WILSON Super Admin'),
         email = coalesce(nullif(email, ''), 'wilson@seribako.com.my'),
         invite_email = coalesce(nullif(invite_email, ''), 'wilson@seribako.com.my'),
         status = 'active',
         deleted_at = null,
         must_change_password = false,
         invitation_status = coalesce(invitation_status, 'active'),
         updated_at = now()
   where id = wilson_staff_id;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'staffs' and column_name = 'is_active'
  ) then
    execute 'update public.staffs set is_active = true where id = $1' using wilson_staff_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'staffs' and column_name = 'disabled_at'
  ) then
    execute 'update public.staffs set disabled_at = null where id = $1' using wilson_staff_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'staffs' and column_name = 'archived_at'
  ) then
    execute 'update public.staffs set archived_at = null where id = $1' using wilson_staff_id;
  end if;

  update public.staff_roles
     set is_primary = false
   where staff_id = wilson_staff_id
     and role_id <> owner_role_id;

  insert into public.staff_roles (staff_id, role_id, branch_id, is_primary, effective_from, effective_to)
  values (wilson_staff_id, owner_role_id, null, true, current_date, null)
  on conflict do nothing;

  update public.staff_roles
     set is_primary = true,
         effective_from = least(coalesce(effective_from, current_date), current_date),
         effective_to = null
   where staff_id = wilson_staff_id
     and role_id = owner_role_id;

  insert into public.role_permissions (role_id, permission_id)
  select owner_role_id, p.id
  from public.permissions p
  on conflict (role_id, permission_id) do nothing;
end $$;
