-- Sprint 7.23.7.0 — P0 Owner access-control closure.
-- Bootstrap is an operator-authorized, service-role-only path. Owner identity
-- relinking is permitted only through the existing Owner-only repair RPC.

create or replace function public.bootstrap_first_admin(p_first_owner_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := p_first_owner_user_id;
  current_email text;
  company_row public.companies%rowtype;
  branch_row public.branches%rowtype;
  main_location_id uuid;
  staff_row public.staffs%rowtype;
  owner_role_row public.roles%rowtype;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'Bootstrap is available only through the authorized server provisioning path.' using errcode = '42501';
  end if;
  if current_user_id is null or not exists (select 1 from auth.users where id = current_user_id) then
    raise exception 'The authorized provisioning path must identify the first Owner.' using errcode = '42501';
  end if;

  -- Serialize first-owner provisioning so concurrent requests cannot both pass
  -- the empty-owner check and create competing Owner assignments.
  perform pg_advisory_xact_lock(hashtextextended('seri-bako:first-owner-bootstrap', 0));
  if public.has_admin_staff_assignment() then
    raise exception 'Setup already completed.' using errcode = '23505';
  end if;

  select users.email into current_email from auth.users as users where users.id = current_user_id;
  if current_email is null or btrim(current_email) = '' then
    raise exception 'The first Owner Auth account must have an email address.' using errcode = '23514';
  end if;

  insert into public.companies (company_code, company_name, status)
  values ('SERI-BAKO', 'Seri Bako Malaysia Sdn. Bhd.', 'active')
  on conflict (company_code) do update set company_name = excluded.company_name, status = 'active', updated_at = now()
  returning * into company_row;

  insert into public.branches (company_id, branch_code, branch_name, branch_type, status)
  values (company_row.id, 'CK', 'Central Kitchen', 'central_kitchen', 'active')
  on conflict (company_id, branch_code) do update set branch_name = excluded.branch_name, branch_type = excluded.branch_type, status = 'active', updated_at = now()
  returning * into branch_row;

  insert into public.locations (company_id, branch_id, location_code, location_name, location_type, status)
  values (company_row.id, branch_row.id, 'MAIN-STORE', 'Main Store', 'dry_store', 'active')
  on conflict (location_code) do update set company_id = excluded.company_id, branch_id = excluded.branch_id, location_name = excluded.location_name, location_type = excluded.location_type, status = 'active', updated_at = now()
  returning public.locations.id into main_location_id;

  insert into public.roles (company_id, role_code, role_name, description, status)
  values (company_row.id, 'super_admin', 'Super Admin / Owner', 'Protected owner role with full company access.', 'active')
  on conflict (company_id, role_code) do update set role_name = excluded.role_name, description = excluded.description, status = 'active', deleted_at = null, updated_at = now()
  returning * into owner_role_row;

  select staffs.* into staff_row from public.staffs as staffs where staffs.auth_user_id = current_user_id limit 1;
  if staff_row.id is null then
    insert into public.staffs (company_id, auth_user_id, staff_code, full_name, email, default_branch_id, status)
    values (company_row.id, current_user_id, 'OWNER-' || left(replace(current_user_id::text, '-', ''), 8), coalesce(nullif(current_email, ''), 'First Owner'), current_email, branch_row.id, 'active')
    returning * into staff_row;
  else
    update public.staffs set company_id = company_row.id, email = coalesce(public.staffs.email, current_email), default_branch_id = branch_row.id, status = 'active', updated_at = now()
    where id = staff_row.id returning * into staff_row;
  end if;

  update public.staff_roles set is_primary = false, updated_at = now() where staff_id = staff_row.id and is_primary = true;
  perform set_config('seri_bako.bootstrap_owner_assignment', 'authorized', true);
  insert into public.staff_roles (staff_id, role_id, branch_id, is_primary, effective_from)
  values (staff_row.id, owner_role_row.id, null, true, current_date)
  on conflict (staff_id, role_id, branch_id) do update set is_primary = true, effective_from = current_date, effective_to = null, updated_at = now();
  update public.staff_branches set is_default = false, updated_at = now() where staff_id = staff_row.id and is_default = true;
  insert into public.staff_branches (staff_id, branch_id, access_level, is_default)
  values (staff_row.id, branch_row.id, 'full', true)
  on conflict (staff_id, branch_id) do update set access_level = 'full', is_default = true;
  insert into public.staff_locations (staff_id, location_id) values (staff_row.id, main_location_id)
  on conflict on constraint staff_locations_staff_id_location_id_key do nothing;
  insert into public.role_permissions (role_id, permission_id) select owner_role_row.id, permissions.id from public.permissions as permissions
  on conflict (role_id, permission_id) do nothing;

  insert into public.document_sequences (company_id, document_type, prefix, next_number, padding, reset_frequency, status)
  values
    (company_row.id, 'purchase_request', 'PR', 1, 5, 'yearly', 'active'), (company_row.id, 'purchase_order', 'PO', 1, 5, 'yearly', 'active'),
    (company_row.id, 'goods_receiving', 'GRN', 1, 5, 'yearly', 'active'), (company_row.id, 'supplier_invoice', 'INV', 1, 5, 'yearly', 'active'),
    (company_row.id, 'stock_count', 'SC', 1, 5, 'yearly', 'active'), (company_row.id, 'stock_transfer', 'ST', 1, 5, 'yearly', 'active'),
    (company_row.id, 'stock_wastage', 'SW', 1, 5, 'yearly', 'active'), (company_row.id, 'production_job', 'PJ', 1, 5, 'yearly', 'active'),
    (company_row.id, 'payment_schedule', 'PAY', 1, 5, 'yearly', 'active'), (company_row.id, 'recipe', 'REC', 1, 5, 'yearly', 'active')
  on conflict (company_id, document_type) do nothing;
end;
$$;

create or replace function public.bootstrap_first_admin()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  raise exception 'Bootstrap requires the authorized server provisioning path.' using errcode = '42501';
end;
$$;

revoke all on function public.bootstrap_first_admin() from public, anon, authenticated, service_role;
revoke all on function public.bootstrap_first_admin(uuid) from public, anon, authenticated;
grant execute on function public.bootstrap_first_admin(uuid) to service_role;

create or replace function public.prevent_owner_auth_relink()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_is_owner boolean;
  actor_is_owner boolean;
begin
  if new.auth_user_id is not distinct from old.auth_user_id then
    return new;
  end if;

  select exists (
    select 1 from public.staff_roles sr
    join public.roles r on r.id = sr.role_id
    where sr.staff_id = old.id and r.company_id = old.company_id
      and r.role_code = 'super_admin' and r.status = 'active' and r.deleted_at is null
      and (sr.effective_from is null or sr.effective_from <= current_date)
      and (sr.effective_to is null or sr.effective_to >= current_date)
  ) into target_is_owner;

  if not target_is_owner then
    return new;
  end if;

  actor_is_owner := exists (
    select 1 from public.staffs s
    join public.staff_roles sr on sr.staff_id = s.id
    join public.roles r on r.id = sr.role_id
    where s.auth_user_id = auth.uid() and s.status = 'active' and s.deleted_at is null
      and r.role_code = 'super_admin' and r.status = 'active' and r.deleted_at is null
      and s.company_id = old.company_id
      and (sr.effective_from is null or sr.effective_from <= current_date)
      and (sr.effective_to is null or sr.effective_to >= current_date)
  );

  if not actor_is_owner or coalesce(current_setting('seri_bako.owner_auth_relink', true), '') <> 'authorized' then
    raise exception 'Owner Auth identity can only be changed by the Owner repair workflow.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_owner_auth_relink on public.staffs;
create trigger prevent_owner_auth_relink
before update of auth_user_id on public.staffs
for each row execute function public.prevent_owner_auth_relink();

create or replace function public.prevent_non_owner_owner_assignment()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  assigning_owner boolean;
  actor_is_owner boolean;
begin
  select r.role_code = 'super_admin' into assigning_owner
  from public.roles r where r.id = new.role_id;
  if not coalesce(assigning_owner, false) then return new; end if;

  actor_is_owner := exists (
    select 1 from public.staffs s
    join public.staff_roles sr on sr.staff_id = s.id
    join public.roles r on r.id = sr.role_id
    where s.auth_user_id = auth.uid() and s.status = 'active' and s.deleted_at is null
      and r.role_code = 'super_admin' and r.status = 'active' and r.deleted_at is null
      and s.company_id = (select company_id from public.staffs where id = new.staff_id)
  );
  if not actor_is_owner
     and coalesce(current_setting('request.jwt.claim.role', true), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'), '') <> 'service_role'
     and coalesce(current_setting('seri_bako.bootstrap_owner_assignment', true), '') <> 'authorized'
     and not (
       current_user in ('postgres', 'supabase_admin')
       and coalesce(current_setting('seri_bako.allow_protected_role_seed', true), '') = 'on'
     ) then
    raise exception 'Only an Owner or the authorized first-owner bootstrap can assign the Owner role.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_non_owner_owner_assignment on public.staff_roles;
create trigger prevent_non_owner_owner_assignment
before insert or update of role_id on public.staff_roles
for each row execute function public.prevent_non_owner_owner_assignment();

-- Recreate the existing Owner-only RPC with an explicit transaction-local
-- capability consumed by the trigger; direct updates and service-role imports
-- cannot set this capability through PostgREST.
create or replace function public.repair_staff_auth_link(
  target_staff_id uuid,
  target_auth_user_id uuid,
  normalized_email text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor public.staffs%rowtype;
  target public.staffs%rowtype;
  normalized text := lower(trim(normalized_email));
  result text;
begin
  select s.* into actor from public.staffs s
  where s.auth_user_id = auth.uid() and s.status = 'active' and s.deleted_at is null;
  if actor.id is null or not public.current_staff_is_owner() then
    raise exception 'Only the Super Admin / Owner can repair a staff sign-in link.' using errcode = '42501';
  end if;
  select s.* into target from public.staffs s
  where s.id = target_staff_id and s.company_id = actor.company_id
    and s.status in ('active', 'invited') and s.deleted_at is null for update;
  if target.id is null then raise exception 'The eligible staff profile was not found.' using errcode = '42501'; end if;
  if normalized = '' or lower(trim(coalesce(target.email, ''))) <> normalized
     or (target.invite_email is not null and lower(trim(target.invite_email)) <> normalized) then
    raise exception 'The staff profile email does not match exactly.' using errcode = '23514';
  end if;
  if not exists (select 1 from auth.users u where u.id = target_auth_user_id and lower(trim(coalesce(u.email, ''))) = normalized) then
    raise exception 'The Auth account email match is missing.' using errcode = '23514';
  end if;
  if exists (select 1 from public.staffs s where s.auth_user_id = target_auth_user_id and s.id <> target.id and s.deleted_at is null) then
    raise exception 'The Auth account is already linked to another staff profile.' using errcode = '23514';
  end if;
  result := case when target.must_change_password or target.status = 'invited' or target.invitation_status in ('invited', 'pending', 'password_required') then 'setup_pending' else 'auth_linked' end;
  if target.auth_user_id = target_auth_user_id then return result; end if;
  perform set_config('seri_bako.owner_auth_relink', 'authorized', true);
  update public.staffs set auth_user_id = target_auth_user_id, updated_at = now() where id = target.id;
  insert into public.activity_logs (company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
  values (actor.company_id, 'staff', target.id, 'auth_link_repaired', 'Owner repaired staff sign-in link', jsonb_build_object('outcome', result), actor.id);
  return result;
end;
$$;

revoke all on function public.prevent_owner_auth_relink() from public, anon, authenticated, service_role;
revoke all on function public.prevent_non_owner_owner_assignment() from public, anon, authenticated, service_role;
revoke all on function public.repair_staff_auth_link(uuid, uuid, text) from public, anon;
grant execute on function public.repair_staff_auth_link(uuid, uuid, text) to authenticated;
