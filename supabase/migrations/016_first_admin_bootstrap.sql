-- =========================================================
-- Seri Bako OMS First Admin Bootstrap
-- Allows the first signed-in user to claim Admin only while no
-- active admin staff role assignment exists.
-- =========================================================

create or replace function public.has_admin_staff_assignment()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_roles sr
    join public.roles r on r.id = sr.role_id
    join public.staffs s on s.id = sr.staff_id
    where r.role_code = 'admin'
      and r.status = 'active'
      and s.status = 'active'
      and sr.effective_from <= current_date
      and (sr.effective_to is null or sr.effective_to >= current_date)
  );
$$;

create or replace function public.bootstrap_first_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  company_row public.companies%rowtype;
  branch_row public.branches%rowtype;
  main_location_id uuid;
  staff_row public.staffs%rowtype;
  admin_role_row public.roles%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication is required to run setup.';
  end if;

  if public.has_admin_staff_assignment() then
    raise exception 'Setup already completed.';
  end if;

  select email into current_email
  from auth.users
  where id = current_user_id;

  insert into public.companies (company_code, company_name, status)
  values ('SERI-BAKO', 'Seri Bako Malaysia Sdn. Bhd.', 'active')
  on conflict (company_code) do update
    set company_name = excluded.company_name,
        status = 'active',
        updated_at = now()
  returning * into company_row;

  insert into public.branches (company_id, branch_code, branch_name, branch_type, status)
  values (company_row.id, 'CK', 'Central Kitchen', 'central_kitchen', 'active')
  on conflict (company_id, branch_code) do update
    set branch_name = excluded.branch_name,
        branch_type = excluded.branch_type,
        status = 'active',
        updated_at = now()
  returning * into branch_row;

  insert into public.locations (company_id, branch_id, location_code, location_name, location_type, status)
  values (company_row.id, branch_row.id, 'MAIN-STORE', 'Main Store', 'dry_store', 'active')
  on conflict (location_code) do update
    set company_id = excluded.company_id,
        branch_id = excluded.branch_id,
        location_name = excluded.location_name,
        location_type = excluded.location_type,
        status = 'active',
        updated_at = now()
  returning public.locations.id into main_location_id;

  insert into public.roles (company_id, role_code, role_name, description, status)
  values (company_row.id, 'admin', 'Admin', 'Full system administration', 'active')
  on conflict (company_id, role_code) do update
    set role_name = excluded.role_name,
        description = excluded.description,
        status = 'active',
        updated_at = now()
  returning * into admin_role_row;

  select * into staff_row
  from public.staffs
  where auth_user_id = current_user_id
  limit 1;

  if staff_row.id is null then
    insert into public.staffs (
      company_id,
      auth_user_id,
      staff_code,
      full_name,
      email,
      default_branch_id,
      status
    )
    values (
      company_row.id,
      current_user_id,
      'ADMIN-' || left(replace(current_user_id::text, '-', ''), 8),
      coalesce(nullif(current_email, ''), 'First Admin'),
      current_email,
      branch_row.id,
      'active'
    )
    returning * into staff_row;
  else
    update public.staffs
    set company_id = company_row.id,
        email = coalesce(public.staffs.email, current_email),
        default_branch_id = branch_row.id,
        status = 'active',
        updated_at = now()
    where id = staff_row.id
    returning * into staff_row;
  end if;

  update public.staff_roles
  set is_primary = false,
      updated_at = now()
  where staff_id = staff_row.id
    and is_primary = true;

  insert into public.staff_roles (staff_id, role_id, branch_id, is_primary, effective_from)
  values (staff_row.id, admin_role_row.id, branch_row.id, true, current_date)
  on conflict (staff_id, role_id, branch_id) do update
    set is_primary = true,
        effective_from = current_date,
        effective_to = null,
        updated_at = now();

  update public.staff_branches
  set is_default = false,
      updated_at = now()
  where staff_id = staff_row.id
    and is_default = true;

  insert into public.staff_branches (staff_id, branch_id, access_level, is_default)
  values (staff_row.id, branch_row.id, 'full', true)
  on conflict (staff_id, branch_id) do update
    set access_level = 'full',
        is_default = true,
        updated_at = now();

  insert into public.staff_locations (staff_id, location_id)
  values (staff_row.id, main_location_id)
  on conflict on constraint staff_locations_staff_id_location_id_key do nothing;

  insert into public.role_permissions (role_id, permission_id)
  select admin_role_row.id, p.id
  from public.permissions p
  on conflict (role_id, permission_id) do nothing;

  insert into public.document_sequences (company_id, document_type, prefix, next_number, padding, reset_frequency, status)
  values
    (company_row.id, 'purchase_request', 'PR', 1, 5, 'yearly', 'active'),
    (company_row.id, 'purchase_order', 'PO', 1, 5, 'yearly', 'active'),
    (company_row.id, 'goods_receiving', 'GRN', 1, 5, 'yearly', 'active'),
    (company_row.id, 'supplier_invoice', 'INV', 1, 5, 'yearly', 'active'),
    (company_row.id, 'stock_count', 'SC', 1, 5, 'yearly', 'active'),
    (company_row.id, 'stock_transfer', 'ST', 1, 5, 'yearly', 'active'),
    (company_row.id, 'stock_wastage', 'SW', 1, 5, 'yearly', 'active'),
    (company_row.id, 'production_job', 'PJ', 1, 5, 'yearly', 'active'),
    (company_row.id, 'payment_schedule', 'PAY', 1, 5, 'yearly', 'active'),
    (company_row.id, 'recipe', 'REC', 1, 5, 'yearly', 'active')
  on conflict (company_id, document_type) do nothing;
end;
$$;

grant execute on function public.has_admin_staff_assignment() to authenticated;
grant execute on function public.bootstrap_first_admin() to authenticated;
