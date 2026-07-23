-- Sprint 7.23.6.0 — Tenant Boundary Closure
-- F-001 canonical tenant RLS, F-002 backup ownership prerequisites,
-- F-003 atomic and company-scoped staff access.

-- Fail closed before any schema or data mutation. The catalog is validated by
-- explicit policy identity, role/mode, command, and row-boundary structure.
do $$
declare
  expected jsonb := $policy_catalog${"roles|roles read": true, "recipes|recipes read": true, "recipes|recipes create": true, "recipes|recipes update": true, "approvals|approvals read": true, "companies|companies read": true, "documents|documents read": true, "locations|locations read": true, "roles|roles admin manage": true, "staffs|staffs scoped read": true, "approvals|approvals manage": true, "audit_logs|audit logs read": true, "audit_logs|audit_logs read": true, "documents|documents create": true, "documents|documents update": true, "staffs|staffs scoped insert": true, "staffs|staffs scoped update": true, "attachments|attachments read": true, "audit_logs|audit logs create": true, "permissions|permissions read": true, "branches|branches scoped read": true, "attachments|attachments create": true, "attachments|attachments insert": true, "attachments|attachments update": true, "recipe_lines|recipe lines read": true, "branches|branches scoped insert": true, "branches|branches scoped update": true, "activity_logs|activity_logs read": true, "companies|companies admin update": true, "locations|locations admin manage": true, "notifications|notifications read": true, "recipe_lines|recipe lines create": true, "recipe_lines|recipe lines delete": true, "recipe_lines|recipe lines update": true, "stock_wastage|stock wastage read": true, "activity_logs|activity logs insert": true, "approval_steps|approval steps read": true, "notifications|notifications create": true, "stock_wastage|stock wastage manage": true, "supplier_items|supplier items read": true, "profiles|Admins can delete profiles": true, "profiles|Admins can insert profiles": true, "profiles|Users can read own profile": true, "staff_roles|staff roles scoped read": true, "approval_steps|approval steps manage": true, "locations|Admin can delete locations": true, "locations|Admin can insert locations": true, "locations|Admin can update locations": true, "production_jobs|production jobs read": true, "purchase_orders|purchase orders read": true, "stock_transfers|stock transfers read": true, "supplier_items|supplier items manage": true, "suppliers|Admin can delete suppliers": true, "uom_conversions|uom conversions read": true, "profiles|Users can update own profile": true, "staff_roles|staff roles scoped manage": true, "stock_counts|stock counts scoped read": true, "barcode_mappings|barcode mappings read": true, "production_jobs|production jobs insert": true, "production_jobs|production jobs update": true, "purchase_orders|purchase orders create": true, "purchase_orders|purchase orders update": true, "role_permissions|role_permissions read": true, "stock_transfers|stock transfers manage": true, "uom_conversions|uom conversions manage": true, "stock_counts|stock counts scoped create": true, "stock_counts|stock counts scoped update": true, "barcode_mappings|barcode mappings manage": true, "document_comments|document comments read": true, "items|Authenticated users can read items": true, "product_packaging|product packaging read": true, "purchase_requests|purchase requests read": true, "supplier_invoices|supplier invoices read": true, "items|Permission holders can delete items": true, "items|Permission holders can insert items": true, "items|Permission holders can update items": true, "staff_branches|staff branches scoped read": true, "document_comments|document comments create": true, "document_revisions|document revisions read": true, "product_packaging|product packaging manage": true, "purchase_requests|purchase requests create": true, "supplier_invoices|supplier invoices insert": true, "supplier_invoices|supplier invoices update": true, "user_preferences|user preferences read own": true, "document_comments|document comments archive": true, "staff_branches|staff branches scoped manage": true, "document_revisions|document revisions create": true, "goods_receivings|goods receiving scoped read": true, "stock_wastage_lines|stock wastage lines read": true, "user_preferences|user preferences manage own": true, "purchase_returns|purchase returns scoped read": true, "goods_receivings|goods receiving scoped create": true, "goods_receivings|goods receiving scoped update": true, "outlet_daily_records|outlet daily records read": true, "products|Authenticated users can read products": true, "purchase_order_lines|purchase order lines read": true, "role_permissions|role permissions admin manage": true, "staff_locations|staff scope compatibility read": true, "stock_transfer_lines|stock transfer lines read": true, "stock_wastage_lines|stock wastage lines manage": true, "purchase_returns|purchase returns scoped insert": true, "purchase_returns|purchase returns scoped update": true, "stock_count_lines|stock count lines scoped read": true, "locations|Authenticated users can read locations": true, "purchase_order_lines|purchase order lines manage": true, "recipe_cost_snapshots|recipe cost snapshots read": true, "staff_locations|staff scope compatibility manage": true, "stock_transfer_lines|stock transfer lines manage": true, "suppliers|Authenticated users can read suppliers": true, "document_sequences|document sequences scoped read": true, "stock_count_lines|stock count lines scoped manage": true, "stock_transactions|stock transactions scoped read": true, "purchase_request_lines|purchase request lines read": true, "recipe_cost_snapshots|recipe cost snapshots create": true, "supplier_invoice_lines|supplier invoice lines read": true, "document_sequences|document sequences scoped insert": true, "document_sequences|document sequences scoped update": true, "suppliers|Admin and purchasing can insert suppliers": true, "suppliers|Admin and purchasing can update suppliers": true, "purchase_request_lines|purchase request lines manage": true, "stock_transaction_lines|stock transaction lines insert": true, "goods_receiving_lines|goods receiving lines scoped read": true, "purchase_return_lines|purchase return lines scoped read": true, "notification_recipients|notification recipients read own": true, "outlet_daily_record_lines|outlet daily record lines read": true, "production_job_output_lines|production output lines read": true, "supplier_invoice_payments|supplier invoice payments read": true, "goods_receiving_lines|goods receiving lines scoped manage": true, "purchase_return_lines|purchase return lines scoped insert": true, "purchase_return_lines|purchase return lines scoped update": true, "branch_supplier_items|branch supplier mappings scoped read": true, "notification_recipients|notification recipients manage own": true, "production_job_output_lines|production output lines insert": true, "production_job_output_lines|production output lines update": true, "staff_permission_overrides|staff permission overrides read": true, "supplier_invoice_payments|supplier invoice payments insert": true, "products|Item master permission holders can delete products": true, "products|Item master permission holders can insert products": true, "products|Item master permission holders can update products": true, "stock_transaction_lines|stock transaction lines scoped read": true, "permanent_deletion_tombstones|owner deletion tombstones read": true, "staff_permission_overrides|staff permission overrides manage": true, "document_sequence_periods|document sequence periods scoped read": true, "stock_transactions|stock transactions insert permission holders": true, "production_job_ingredient_lines|production ingredient lines read": true, "production_job_ingredient_lines|production ingredient lines insert": true, "production_job_ingredient_lines|production ingredient lines update": true}$policy_catalog$::jsonb;
  actual jsonb := '{}'::jsonb;
  policy_row record;
  policy_key text;
begin
  -- Target-compatible 001–080 replay does not contain the legacy roles-read
  -- policy; 081 creates the tenant-scoped replacement below.
  expected := expected - 'roles|roles read';
  for policy_row in
    select schemaname, tablename, policyname, cmd, roles, permissive, qual, with_check
    from pg_policies where schemaname = 'public'
  loop
    policy_key := policy_row.tablename || '|' || policy_row.policyname;
    if policy_key = 'roles|roles read' then
      continue;
    end if;
    if not expected ? policy_key then
      raise exception 'Tenant policy catalog contains unexpected policy: %', policy_key using errcode = '23514';
    end if;
    if policy_row.roles <> array['authenticated']::name[] or policy_row.permissive <> 'PERMISSIVE' then
      raise exception 'Tenant policy catalog has an unexpected role or permissive mode: %', policy_key using errcode = '23514';
    end if;
    if policy_row.cmd not in ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL') then
      raise exception 'Tenant policy catalog has an invalid command: %', policy_key using errcode = '23514';
    end if;
    if policy_row.qual is null and policy_row.with_check is null
       and policy_row.tablename in ('companies','branches','locations','staffs','roles','staff_roles','staff_branches','staff_locations','items','products','suppliers','supplier_items','documents','purchase_orders','purchase_requests','stock_transactions','stock_transfers','stock_wastage') then
      raise exception 'Tenant policy catalog lacks a row boundary expression: %', policy_key using errcode = '23514';
    end if;
    actual := actual || jsonb_build_object(policy_key, true);
  end loop;
  select key into policy_key from jsonb_each_text(expected) where not actual ? key limit 1;
  if policy_key is not null then
    raise exception 'Tenant policy catalog is missing expected policy: %', policy_key using errcode = '23514';
  end if;
end $$;



-- The legacy master tables pre-date companies. Existing rows can only be
-- migrated automatically when the installation has one company; on a
-- multi-company installation ambiguity is a hard stop rather than a guess.
alter table public.items add column if not exists company_id uuid references public.companies(id);
alter table public.products add column if not exists company_id uuid references public.companies(id);
alter table public.suppliers add column if not exists company_id uuid references public.companies(id);
alter table public.supplier_items add column if not exists company_id uuid references public.companies(id);
alter table public.uom_conversions add column if not exists company_id uuid references public.companies(id);

do $$
declare
  singleton_company_id uuid;
  company_count integer;
begin
  select (array_agg(id order by id))[1], count(*) into singleton_company_id, company_count
  from public.companies;

  if company_count = 1 then
    update public.items set company_id = singleton_company_id where company_id is null;
    update public.products set company_id = singleton_company_id where company_id is null;
    update public.suppliers set company_id = singleton_company_id where company_id is null;
    update public.uom_conversions set company_id = singleton_company_id where company_id is null;
    update public.recipes set company_id = singleton_company_id where company_id is null;
  elsif exists (select 1 from public.items where company_id is null)
     or exists (select 1 from public.products where company_id is null)
     or exists (select 1 from public.suppliers where company_id is null)
     or exists (select 1 from public.uom_conversions where company_id is null)
     or exists (select 1 from public.recipes where company_id is null) then
    raise exception using
      errcode = '23514',
      message = 'Tenant closure cannot infer ownership for legacy master rows in a multi-company database.',
      hint = 'Assign company_id on items, products, suppliers, uom_conversions, and recipes before applying migration 081.';
  end if;

  update public.supplier_items si
  set company_id = i.company_id
  from public.items i
  where i.id = si.item_id and si.company_id is null;

  if exists (
    select 1
    from public.supplier_items si
    join public.items i on i.id = si.item_id
    join public.suppliers s on s.id = si.supplier_id
    where si.company_id is distinct from i.company_id
       or si.company_id is distinct from s.company_id
  ) then
    raise exception 'Supplier item relationships cross company boundaries.';
  end if;
end $$;

alter table public.items alter column company_id set not null;
alter table public.products alter column company_id set not null;
alter table public.suppliers alter column company_id set not null;
alter table public.supplier_items alter column company_id set not null;
alter table public.uom_conversions alter column company_id set not null;
alter table public.recipes alter column company_id set not null;

alter table public.items drop constraint if exists items_item_code_key;
alter table public.products drop constraint if exists products_product_code_key;
alter table public.suppliers drop constraint if exists suppliers_supplier_code_key;
create unique index if not exists items_company_code_active_idx
  on public.items(company_id, item_code) where deleted_at is null;
create unique index if not exists products_company_code_active_idx
  on public.products(company_id, product_code) where deleted_at is null;
create unique index if not exists suppliers_company_code_active_idx
  on public.suppliers(company_id, supplier_code) where deleted_at is null and supplier_code is not null;
create index if not exists items_company_idx on public.items(company_id);
create index if not exists products_company_idx on public.products(company_id);
create index if not exists suppliers_company_idx on public.suppliers(company_id);
create index if not exists supplier_items_company_idx on public.supplier_items(company_id);
create index if not exists uom_conversions_company_idx on public.uom_conversions(company_id);
drop index if exists public.uom_conversions_pair_active_idx;
drop index if exists public.uom_conversions_item_pair_active_idx;
create unique index uom_conversions_company_pair_active_idx
  on public.uom_conversions(company_id, lower(from_uom), lower(to_uom))
  where item_id is null and deleted_at is null and status = 'active';
create unique index uom_conversions_company_item_pair_active_idx
  on public.uom_conversions(company_id, item_id, lower(from_uom), lower(to_uom))
  where item_id is not null and deleted_at is null and status = 'active';

alter table public.items drop constraint if exists items_id_company_unique;
alter table public.items add constraint items_id_company_unique unique (id, company_id);
alter table public.products drop constraint if exists products_id_company_unique;
alter table public.products add constraint products_id_company_unique unique (id, company_id);
alter table public.suppliers drop constraint if exists suppliers_id_company_unique;
alter table public.suppliers add constraint suppliers_id_company_unique unique (id, company_id);

alter table public.items drop constraint if exists items_supplier_id_fkey;
alter table public.items add constraint items_supplier_company_fkey
  foreign key (supplier_id, company_id) references public.suppliers(id, company_id) on delete set null (supplier_id);
alter table public.supplier_items drop constraint if exists supplier_items_supplier_id_fkey;
alter table public.supplier_items drop constraint if exists supplier_items_item_id_fkey;
alter table public.supplier_items add constraint supplier_items_supplier_company_fkey
  foreign key (supplier_id, company_id) references public.suppliers(id, company_id);
alter table public.supplier_items add constraint supplier_items_item_company_fkey
  foreign key (item_id, company_id) references public.items(id, company_id);
alter table public.uom_conversions drop constraint if exists uom_conversions_item_id_fkey;
alter table public.uom_conversions add constraint uom_conversions_item_company_fkey
  foreign key (item_id, company_id) references public.items(id, company_id);

create or replace function public.current_staff_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select s.id
  from public.staffs s
  where s.auth_user_id = auth.uid()
    and s.status = 'active'
    and s.deleted_at is null
  limit 1
$$;

create or replace function public.current_staff_company_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select s.company_id
  from public.staffs s
  where s.auth_user_id = auth.uid()
    and s.status = 'active'
    and s.deleted_at is null
  limit 1
$$;

create or replace function public.current_staff_has_company_role(role_codes text[])
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.staffs s
    join public.staff_roles sr on sr.staff_id = s.id
    join public.roles r on r.id = sr.role_id and r.company_id = s.company_id
    where s.auth_user_id = auth.uid()
      and s.status = 'active' and s.deleted_at is null
      and r.status = 'active' and r.deleted_at is null
      and r.role_code = any(role_codes)
      and (sr.effective_from is null or sr.effective_from <= current_date)
      and (sr.effective_to is null or sr.effective_to >= current_date)
  )
$$;

create or replace function public.can_access_company_branch(target_company_id uuid, target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select target_company_id = public.current_staff_company_id()
    and (
      (
        target_branch_id is null
        and public.current_staff_has_company_role(array['super_admin','finance','manager','purchasing'])
      )
      or exists (
        select 1
        from public.branches b
        where b.id = target_branch_id
          and b.company_id = target_company_id
          and (
            public.current_staff_has_company_role(array['super_admin','finance','manager','purchasing'])
            or exists (select 1 from public.staff_branches sb where sb.branch_id = b.id and sb.staff_id = public.current_staff_id())
          )
      )
    )
$$;

create or replace function public.can_access_inventory_branch(target_company_id uuid, target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.can_access_company_branch(target_company_id, target_branch_id)
$$;

drop function if exists public.replace_staff_access_atomic(uuid, uuid, uuid, uuid[]);
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
  actor record;
  target record;
  selected_role record;
  actor_is_owner boolean;
  target_was_owner boolean;
  company_wide boolean;
  requested_branch_ids uuid[];
  eligible_branch_ids uuid[];
  invalid_count integer;
  remaining_owner_count integer;
begin
  select s.id, s.company_id into actor
  from public.staffs s
  where s.auth_user_id = auth.uid() and s.status = 'active' and s.deleted_at is null
  for update;
  if actor.id is null or not public.has_permission('staffs.update') then
    raise exception 'Active staff with staffs.update permission required.' using errcode = '42501';
  end if;

  select s.id, s.company_id into target
  from public.staffs s
  where s.id = p_staff_id and s.company_id = actor.company_id and s.deleted_at is null
  for update;
  if target.id is null then
    raise exception 'Target staff was not found in your company.' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('owner:' || actor.company_id::text, 0));

  select r.id, r.role_code into selected_role
  from public.roles r
  where r.id = p_role_id and r.company_id = actor.company_id
    and r.status = 'active' and r.deleted_at is null;
  if selected_role.id is null then
    raise exception 'Selected role was not found in your company.' using errcode = '42501';
  end if;

  actor_is_owner := public.current_staff_has_company_role(array['super_admin']);
  select exists (
    select 1 from public.staff_roles sr join public.roles r on r.id = sr.role_id
    where sr.staff_id = p_staff_id and r.company_id = actor.company_id and r.role_code = 'super_admin'
      and r.status = 'active' and r.deleted_at is null
      and (sr.effective_from is null or sr.effective_from <= current_date)
      and (sr.effective_to is null or sr.effective_to >= current_date)
  ) into target_was_owner;

  if (selected_role.role_code = 'super_admin' or target_was_owner) and not actor_is_owner then
    raise exception 'Only an Owner can assign or change an Owner role.' using errcode = '42501';
  end if;

  if target_was_owner and (selected_role.role_code <> 'super_admin' or coalesce(p_status, 'active'::public.record_status) <> 'active'::public.record_status) then
    select count(distinct s.id) into remaining_owner_count
    from public.staffs s
    join public.staff_roles sr on sr.staff_id = s.id
    join public.roles r on r.id = sr.role_id and r.company_id = s.company_id
    where s.company_id = actor.company_id and s.id <> p_staff_id
      and s.status = 'active' and s.deleted_at is null
      and r.role_code = 'super_admin' and r.status = 'active' and r.deleted_at is null
      and (sr.effective_from is null or sr.effective_from <= current_date)
      and (sr.effective_to is null or sr.effective_to >= current_date);
    if remaining_owner_count = 0 then
      raise exception 'Cannot remove the last Owner in this company.' using errcode = '23514';
    end if;
  end if;

  company_wide := selected_role.role_code = any(array['super_admin','finance','manager','purchasing']);
  requested_branch_ids := array(
    select distinct x from unnest(coalesce(p_accessible_branch_ids, '{}'::uuid[]) || array[p_default_branch_id]) x
    where x is not null
  );

  select count(*) into invalid_count
  from unnest(requested_branch_ids) requested(id)
  left join public.branches b on b.id = requested.id
    and b.company_id = actor.company_id and b.status = 'active' and b.deleted_at is null
  where b.id is null
     or (selected_role.role_code = 'kitchen' and b.branch_type <> 'central_kitchen')
     or (selected_role.role_code = 'outlet_staff' and b.branch_type <> 'outlet');
  if invalid_count > 0 then
    raise exception 'One or more branch IDs are not eligible in your company.' using errcode = '42501';
  end if;

  if company_wide then
    select array_agg(b.id order by b.id) into eligible_branch_ids
    from public.branches b
    where b.company_id = actor.company_id and b.status = 'active' and b.deleted_at is null;
  else
    eligible_branch_ids := requested_branch_ids;
  end if;

  if p_default_branch_id is null or not (p_default_branch_id = any(coalesce(eligible_branch_ids, '{}'::uuid[]))) then
    raise exception 'Default branch is not eligible for the selected role.' using errcode = '23514';
  end if;

  delete from public.staff_locations where staff_id = p_staff_id;
  delete from public.staff_branches where staff_id = p_staff_id;
  delete from public.staff_roles where staff_id = p_staff_id;

  insert into public.staff_roles(staff_id, role_id, branch_id, is_primary, effective_from, effective_to)
  values (p_staff_id, p_role_id, case when company_wide then null else p_default_branch_id end, true, current_date, null);

  insert into public.staff_branches(staff_id, branch_id, access_level, is_default)
  select p_staff_id, b.id,
    case when selected_role.role_code = 'super_admin' then 'full'::public.staff_access_level
         when company_wide then 'manage'::public.staff_access_level
         else 'read_only'::public.staff_access_level end,
    b.id = p_default_branch_id
  from public.branches b where b.id = any(eligible_branch_ids);

  insert into public.staff_locations(staff_id, location_id)
  select p_staff_id, b.default_location_id
  from public.branches b
  where b.id = any(eligible_branch_ids) and b.default_location_id is not null;

  update public.staffs set default_branch_id = p_default_branch_id,
    status = coalesce(p_status, status),
    staff_code = coalesce(p_staff_code, staff_code),
    full_name = coalesce(p_full_name, full_name),
    email = coalesce(p_email, email),
    phone = p_phone,
    invite_email = coalesce(p_email, invite_email),
    updated_at = now()
  where id = p_staff_id and company_id = actor.company_id;

  return jsonb_build_object('staff_id', p_staff_id, 'role_code', selected_role.role_code,
    'branch_count', coalesce(cardinality(eligible_branch_ids), 0));
end
$$;

revoke all on function public.current_staff_id() from public, anon;
revoke all on function public.current_staff_company_id() from public, anon;
revoke all on function public.current_staff_has_company_role(text[]) from public, anon;
revoke all on function public.can_access_company_branch(uuid, uuid) from public, anon;
revoke all on function public.can_access_inventory_branch(uuid, uuid) from public, anon;
revoke all on function public.replace_staff_access_atomic(uuid, uuid, uuid, uuid[], public.record_status, text, text, text, text) from public, anon;
grant execute on function public.current_staff_id() to authenticated;
grant execute on function public.current_staff_company_id() to authenticated;
grant execute on function public.current_staff_has_company_role(text[]) to authenticated;
grant execute on function public.can_access_company_branch(uuid, uuid) to authenticated;
grant execute on function public.can_access_inventory_branch(uuid, uuid) to authenticated;
grant execute on function public.replace_staff_access_atomic(uuid, uuid, uuid, uuid[], public.record_status, text, text, text, text) to authenticated;

create or replace function public.set_staff_status_atomic(p_staff_id uuid, p_status public.record_status)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
declare actor record; target record; target_was_owner boolean; actor_is_owner boolean; remaining_owner_count integer;
begin
  select id, company_id into actor from public.staffs where auth_user_id = auth.uid() and status = 'active' and deleted_at is null for update;
  if actor.id is null or not public.has_permission('staffs.update') then raise exception 'Active staff with staffs.update permission required.' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('owner:' || actor.company_id::text, 0));
  select id, company_id into target from public.staffs where id = p_staff_id and company_id = actor.company_id and deleted_at is null for update;
  if target.id is null then raise exception 'Target staff was not found in your company.' using errcode = '42501'; end if;
  select exists (select 1 from public.staff_roles sr join public.roles r on r.id=sr.role_id where sr.staff_id=p_staff_id and r.company_id=actor.company_id and r.role_code='super_admin' and r.status='active' and r.deleted_at is null and (sr.effective_from is null or sr.effective_from<=current_date) and (sr.effective_to is null or sr.effective_to>=current_date)) into target_was_owner;
  actor_is_owner := public.current_staff_has_company_role(array['super_admin']);
  if target_was_owner and not actor_is_owner then
    raise exception 'Only an Owner can disable an Owner account.' using errcode = '42501';
  end if;
  if target_was_owner and p_status <> 'active' then
    select count(distinct s.id) into remaining_owner_count from public.staffs s join public.staff_roles sr on sr.staff_id=s.id join public.roles r on r.id=sr.role_id and r.company_id=s.company_id where s.company_id=actor.company_id and s.id<>p_staff_id and s.status='active' and s.deleted_at is null and r.role_code='super_admin' and r.status='active' and r.deleted_at is null and (sr.effective_from is null or sr.effective_from<=current_date) and (sr.effective_to is null or sr.effective_to>=current_date);
    if remaining_owner_count = 0 then raise exception 'Cannot disable the last Owner in this company.' using errcode = '23514'; end if;
  end if;
  update public.staffs set status=p_status, updated_at=now() where id=p_staff_id and company_id=actor.company_id;
end $$;
revoke all on function public.set_staff_status_atomic(uuid, public.record_status) from public, anon;
grant execute on function public.set_staff_status_atomic(uuid, public.record_status) to authenticated;

-- Exact final-state reconciliation: remove every policy present after 080.
drop policy if exists "activity logs insert" on public.activity_logs;
drop policy if exists "activity_logs read" on public.activity_logs;
drop policy if exists "approval steps manage" on public.approval_steps;
drop policy if exists "approval steps read" on public.approval_steps;
drop policy if exists "approvals manage" on public.approvals;
drop policy if exists "approvals read" on public.approvals;
drop policy if exists "attachments create" on public.attachments;
drop policy if exists "attachments insert" on public.attachments;
drop policy if exists "attachments read" on public.attachments;
drop policy if exists "attachments update" on public.attachments;
drop policy if exists "audit logs create" on public.audit_logs;
drop policy if exists "audit logs read" on public.audit_logs;
drop policy if exists "audit_logs read" on public.audit_logs;
drop policy if exists "barcode mappings manage" on public.barcode_mappings;
drop policy if exists "barcode mappings read" on public.barcode_mappings;
drop policy if exists "branch supplier mappings scoped read" on public.branch_supplier_items;
drop policy if exists "branches scoped insert" on public.branches;
drop policy if exists "branches scoped read" on public.branches;
drop policy if exists "branches scoped update" on public.branches;
drop policy if exists "companies admin update" on public.companies;
drop policy if exists "companies read" on public.companies;
drop policy if exists "document comments archive" on public.document_comments;
drop policy if exists "document comments create" on public.document_comments;
drop policy if exists "document comments read" on public.document_comments;
drop policy if exists "document revisions create" on public.document_revisions;
drop policy if exists "document revisions read" on public.document_revisions;
drop policy if exists "document sequence periods scoped read" on public.document_sequence_periods;
drop policy if exists "document sequences scoped insert" on public.document_sequences;
drop policy if exists "document sequences scoped read" on public.document_sequences;
drop policy if exists "document sequences scoped update" on public.document_sequences;
drop policy if exists "documents create" on public.documents;
drop policy if exists "documents read" on public.documents;
drop policy if exists "documents update" on public.documents;
drop policy if exists "goods receiving lines scoped manage" on public.goods_receiving_lines;
drop policy if exists "goods receiving lines scoped read" on public.goods_receiving_lines;
drop policy if exists "goods receiving scoped create" on public.goods_receivings;
drop policy if exists "goods receiving scoped read" on public.goods_receivings;
drop policy if exists "goods receiving scoped update" on public.goods_receivings;
drop policy if exists "Authenticated users can read items" on public.items;
drop policy if exists "Permission holders can delete items" on public.items;
drop policy if exists "Permission holders can insert items" on public.items;
drop policy if exists "Permission holders can update items" on public.items;
drop policy if exists "Admin can delete locations" on public.locations;
drop policy if exists "Admin can insert locations" on public.locations;
drop policy if exists "Admin can update locations" on public.locations;
drop policy if exists "Authenticated users can read locations" on public.locations;
drop policy if exists "locations admin manage" on public.locations;
drop policy if exists "locations read" on public.locations;
drop policy if exists "notification recipients manage own" on public.notification_recipients;
drop policy if exists "notification recipients read own" on public.notification_recipients;
drop policy if exists "notifications create" on public.notifications;
drop policy if exists "notifications read" on public.notifications;
drop policy if exists "outlet daily record lines read" on public.outlet_daily_record_lines;
drop policy if exists "outlet daily records read" on public.outlet_daily_records;
drop policy if exists "owner deletion tombstones read" on public.permanent_deletion_tombstones;
drop policy if exists "permissions read" on public.permissions;
drop policy if exists "product packaging manage" on public.product_packaging;
drop policy if exists "product packaging read" on public.product_packaging;
drop policy if exists "production ingredient lines insert" on public.production_job_ingredient_lines;
drop policy if exists "production ingredient lines read" on public.production_job_ingredient_lines;
drop policy if exists "production ingredient lines update" on public.production_job_ingredient_lines;
drop policy if exists "production output lines insert" on public.production_job_output_lines;
drop policy if exists "production output lines read" on public.production_job_output_lines;
drop policy if exists "production output lines update" on public.production_job_output_lines;
drop policy if exists "production jobs insert" on public.production_jobs;
drop policy if exists "production jobs read" on public.production_jobs;
drop policy if exists "production jobs update" on public.production_jobs;
drop policy if exists "Authenticated users can read products" on public.products;
drop policy if exists "Item master permission holders can delete products" on public.products;
drop policy if exists "Item master permission holders can insert products" on public.products;
drop policy if exists "Item master permission holders can update products" on public.products;
drop policy if exists "Admins can delete profiles" on public.profiles;
drop policy if exists "Admins can insert profiles" on public.profiles;
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "purchase order lines manage" on public.purchase_order_lines;
drop policy if exists "purchase order lines read" on public.purchase_order_lines;
drop policy if exists "purchase orders create" on public.purchase_orders;
drop policy if exists "purchase orders read" on public.purchase_orders;
drop policy if exists "purchase orders update" on public.purchase_orders;
drop policy if exists "purchase request lines manage" on public.purchase_request_lines;
drop policy if exists "purchase request lines read" on public.purchase_request_lines;
drop policy if exists "purchase requests create" on public.purchase_requests;
drop policy if exists "purchase requests read" on public.purchase_requests;
drop policy if exists "purchase return lines scoped insert" on public.purchase_return_lines;
drop policy if exists "purchase return lines scoped read" on public.purchase_return_lines;
drop policy if exists "purchase return lines scoped update" on public.purchase_return_lines;
drop policy if exists "purchase returns scoped insert" on public.purchase_returns;
drop policy if exists "purchase returns scoped read" on public.purchase_returns;
drop policy if exists "purchase returns scoped update" on public.purchase_returns;
drop policy if exists "recipe cost snapshots create" on public.recipe_cost_snapshots;
drop policy if exists "recipe cost snapshots read" on public.recipe_cost_snapshots;
drop policy if exists "recipe lines create" on public.recipe_lines;
drop policy if exists "recipe lines delete" on public.recipe_lines;
drop policy if exists "recipe lines read" on public.recipe_lines;
drop policy if exists "recipe lines update" on public.recipe_lines;
drop policy if exists "recipes create" on public.recipes;
drop policy if exists "recipes read" on public.recipes;
drop policy if exists "recipes update" on public.recipes;
drop policy if exists "role permissions admin manage" on public.role_permissions;
drop policy if exists "role_permissions read" on public.role_permissions;
drop policy if exists "roles admin manage" on public.roles;
drop policy if exists "roles read" on public.roles;
drop policy if exists "staff branches scoped manage" on public.staff_branches;
drop policy if exists "staff branches scoped read" on public.staff_branches;
drop policy if exists "staff scope compatibility manage" on public.staff_locations;
drop policy if exists "staff scope compatibility read" on public.staff_locations;
drop policy if exists "staff permission overrides manage" on public.staff_permission_overrides;
drop policy if exists "staff permission overrides read" on public.staff_permission_overrides;
drop policy if exists "staff roles scoped manage" on public.staff_roles;
drop policy if exists "staff roles scoped read" on public.staff_roles;
drop policy if exists "staffs scoped insert" on public.staffs;
drop policy if exists "staffs scoped read" on public.staffs;
drop policy if exists "staffs scoped update" on public.staffs;
drop policy if exists "stock count lines scoped manage" on public.stock_count_lines;
drop policy if exists "stock count lines scoped read" on public.stock_count_lines;
drop policy if exists "stock counts scoped create" on public.stock_counts;
drop policy if exists "stock counts scoped read" on public.stock_counts;
drop policy if exists "stock counts scoped update" on public.stock_counts;
drop policy if exists "stock transaction lines insert" on public.stock_transaction_lines;
drop policy if exists "stock transaction lines scoped read" on public.stock_transaction_lines;
drop policy if exists "stock transactions insert permission holders" on public.stock_transactions;
drop policy if exists "stock transactions scoped read" on public.stock_transactions;
drop policy if exists "stock transfer lines manage" on public.stock_transfer_lines;
drop policy if exists "stock transfer lines read" on public.stock_transfer_lines;
drop policy if exists "stock transfers manage" on public.stock_transfers;
drop policy if exists "stock transfers read" on public.stock_transfers;
drop policy if exists "stock wastage manage" on public.stock_wastage;
drop policy if exists "stock wastage read" on public.stock_wastage;
drop policy if exists "stock wastage lines manage" on public.stock_wastage_lines;
drop policy if exists "stock wastage lines read" on public.stock_wastage_lines;
drop policy if exists "supplier invoice lines read" on public.supplier_invoice_lines;
drop policy if exists "supplier invoice payments insert" on public.supplier_invoice_payments;
drop policy if exists "supplier invoice payments read" on public.supplier_invoice_payments;
drop policy if exists "supplier invoices insert" on public.supplier_invoices;
drop policy if exists "supplier invoices read" on public.supplier_invoices;
drop policy if exists "supplier invoices update" on public.supplier_invoices;
drop policy if exists "supplier items manage" on public.supplier_items;
drop policy if exists "supplier items read" on public.supplier_items;
drop policy if exists "Admin and purchasing can insert suppliers" on public.suppliers;
drop policy if exists "Admin and purchasing can update suppliers" on public.suppliers;
drop policy if exists "Admin can delete suppliers" on public.suppliers;
drop policy if exists "Authenticated users can read suppliers" on public.suppliers;
drop policy if exists "uom conversions manage" on public.uom_conversions;
drop policy if exists "uom conversions read" on public.uom_conversions;
drop policy if exists "user preferences manage own" on public.user_preferences;
drop policy if exists "user preferences read own" on public.user_preferences;

-- Identity/reference data.
create policy "tenant companies read" on public.companies for select to authenticated
  using (id = public.current_staff_company_id());
create policy "tenant companies update" on public.companies for update to authenticated
  using (id = public.current_staff_company_id() and public.has_permission('company.update'))
  with check (id = public.current_staff_company_id() and public.has_permission('company.update'));
create policy "tenant permissions global reference" on public.permissions for select to authenticated
  using (deleted_at is null);
comment on policy "tenant permissions global reference" on public.permissions is
  'Intentionally global immutable capability-code reference data; contains no tenant business content.';
create policy "tenant profiles own" on public.profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Company, staff, and access control.
create policy "tenant branches read" on public.branches for select to authenticated
  using (public.can_access_company_branch(company_id, id) and public.has_any_permission(array['branches.read','branches.create','branches.update']));
create policy "tenant branches insert" on public.branches for insert to authenticated
  with check (company_id = public.current_staff_company_id() and public.has_permission('branches.create'));
create policy "tenant branches update" on public.branches for update to authenticated
  using (company_id = public.current_staff_company_id() and public.has_permission('branches.update'))
  with check (company_id = public.current_staff_company_id() and public.has_permission('branches.update'));
create policy "tenant locations read" on public.locations for select to authenticated
  using (public.can_access_company_branch(company_id, branch_id));
create policy "tenant locations manage" on public.locations for all to authenticated
  using (public.can_access_company_branch(company_id, branch_id) and public.has_permission('locations.update'))
  with check (public.can_access_company_branch(company_id, branch_id) and public.has_any_permission(array['locations.create','locations.update']));
create policy "tenant staffs read" on public.staffs for select to authenticated
  using ((auth_user_id = auth.uid() and status = 'active' and deleted_at is null)
    or (company_id = public.current_staff_company_id() and public.has_permission('staffs.read')));
create policy "tenant staffs insert" on public.staffs for insert to authenticated
  with check (company_id = public.current_staff_company_id() and public.has_permission('staffs.create'));
create policy "tenant staffs update" on public.staffs for update to authenticated
  using (company_id = public.current_staff_company_id() and public.has_permission('staffs.update'))
  with check (company_id = public.current_staff_company_id() and public.has_permission('staffs.update'));
create policy "tenant roles read" on public.roles for select to authenticated
  using (company_id = public.current_staff_company_id());
create policy "tenant roles manage" on public.roles for all to authenticated
  using (company_id = public.current_staff_company_id() and public.has_permission('roles.update'))
  with check (company_id = public.current_staff_company_id() and public.has_any_permission(array['roles.create','roles.update']));
create policy "tenant role permissions read" on public.role_permissions for select to authenticated
  using (exists (select 1 from public.roles r where r.id = role_permissions.role_id and r.company_id = public.current_staff_company_id()));
create policy "tenant staff roles read" on public.staff_roles for select to authenticated
  using (exists (select 1 from public.staffs s where s.id = staff_roles.staff_id and s.company_id = public.current_staff_company_id()
    and (s.auth_user_id = auth.uid() or public.has_permission('staffs.read'))));
create policy "tenant staff branches read" on public.staff_branches for select to authenticated
  using (exists (select 1 from public.staffs s join public.branches b on b.id = staff_branches.branch_id
    where s.id = staff_branches.staff_id and s.company_id = public.current_staff_company_id() and b.company_id = s.company_id
      and (s.auth_user_id = auth.uid() or public.has_permission('staffs.read'))));
create policy "tenant staff locations read" on public.staff_locations for select to authenticated
  using (exists (select 1 from public.staffs s join public.locations l on l.id = staff_locations.location_id
    where s.id = staff_locations.staff_id and s.company_id = public.current_staff_company_id() and l.company_id = s.company_id
      and (s.auth_user_id = auth.uid() or public.has_permission('staffs.read'))));
create policy "tenant staff overrides read" on public.staff_permission_overrides for select to authenticated
  using (exists (select 1 from public.staffs s where s.id = staff_permission_overrides.staff_id
    and s.company_id = public.current_staff_company_id() and (s.auth_user_id = auth.uid() or public.has_permission('roles.update'))));

-- Operational masters.
create policy "tenant items read" on public.items for select to authenticated
  using (company_id = public.current_staff_company_id());
create policy "tenant items manage" on public.items for all to authenticated
  using (company_id = public.current_staff_company_id() and public.has_permission('items.update'))
  with check (company_id = public.current_staff_company_id() and public.has_any_permission(array['items.create','items.update']));
create policy "tenant products read" on public.products for select to authenticated
  using (company_id = public.current_staff_company_id());
create policy "tenant products manage" on public.products for all to authenticated
  using (company_id = public.current_staff_company_id() and public.has_permission('items.update'))
  with check (company_id = public.current_staff_company_id() and public.has_any_permission(array['items.create','items.update']));
create policy "tenant suppliers read" on public.suppliers for select to authenticated
  using (company_id = public.current_staff_company_id());
create policy "tenant suppliers manage" on public.suppliers for all to authenticated
  using (company_id = public.current_staff_company_id() and public.has_permission('suppliers.update'))
  with check (company_id = public.current_staff_company_id() and public.has_any_permission(array['suppliers.create','suppliers.update']));
create policy "tenant supplier items read" on public.supplier_items for select to authenticated
  using (company_id = public.current_staff_company_id()
    and exists (select 1 from public.items i where i.id = supplier_items.item_id and i.company_id = supplier_items.company_id)
    and exists (select 1 from public.suppliers s where s.id = supplier_items.supplier_id and s.company_id = supplier_items.company_id));
create policy "tenant supplier items manage" on public.supplier_items for all to authenticated
  using (company_id = public.current_staff_company_id() and public.has_permission('supplier_items.update'))
  with check (company_id = public.current_staff_company_id()
    and public.has_any_permission(array['supplier_items.create','supplier_items.update'])
    and exists (select 1 from public.items i where i.id = supplier_items.item_id and i.company_id = supplier_items.company_id)
    and exists (select 1 from public.suppliers s where s.id = supplier_items.supplier_id and s.company_id = supplier_items.company_id));
create policy "tenant uom conversions read" on public.uom_conversions for select to authenticated
  using (company_id = public.current_staff_company_id()
    and (item_id is null or exists (select 1 from public.items i where i.id = uom_conversions.item_id and i.company_id = uom_conversions.company_id)));
create policy "tenant uom conversions manage" on public.uom_conversions for all to authenticated
  using (company_id = public.current_staff_company_id() and public.has_permission('uom_conversions.update'))
  with check (company_id = public.current_staff_company_id() and public.has_any_permission(array['uom_conversions.create','uom_conversions.update'])
    and (item_id is null or exists (select 1 from public.items i where i.id = uom_conversions.item_id and i.company_id = uom_conversions.company_id)));
create policy "tenant packaging read" on public.product_packaging for select to authenticated
  using (exists (select 1 from public.products p where p.id = product_packaging.product_id and p.company_id = public.current_staff_company_id()));
create policy "tenant packaging manage" on public.product_packaging for all to authenticated
  using (public.has_permission('items.update') and exists (select 1 from public.products p where p.id = product_packaging.product_id and p.company_id = public.current_staff_company_id()))
  with check (public.has_any_permission(array['items.create','items.update']) and exists (select 1 from public.products p where p.id = product_packaging.product_id and p.company_id = public.current_staff_company_id()));
create policy "tenant barcode mappings read" on public.barcode_mappings for select to authenticated
  using (company_id = public.current_staff_company_id());
create policy "tenant barcode mappings manage" on public.barcode_mappings for all to authenticated
  using (company_id = public.current_staff_company_id() and public.has_any_permission(array['items.create','items.update']))
  with check (company_id = public.current_staff_company_id() and public.has_any_permission(array['items.create','items.update'])
    and (item_id is null or exists (select 1 from public.items i where i.id = barcode_mappings.item_id and i.company_id = barcode_mappings.company_id))
    and (product_id is null or exists (select 1 from public.products p where p.id = barcode_mappings.product_id and p.company_id = barcode_mappings.company_id)));
create policy "tenant branch supplier mappings read" on public.branch_supplier_items for select to authenticated
  using (exists (select 1 from public.branches b join public.supplier_items si on si.id = branch_supplier_items.supplier_item_id
    where b.id = branch_supplier_items.branch_id and si.item_id = branch_supplier_items.item_id
      and si.company_id = b.company_id and public.can_access_company_branch(b.company_id, b.id)
      and public.has_any_permission(array['supplier_items.read','supplier_items.view','purchase_request.create','pr.create','purchase_order.create','po.create'])));

-- Shared documents, logs, notifications, and sequences.
create policy "tenant activity logs read" on public.activity_logs for select to authenticated
  using (company_id = public.current_staff_company_id() and public.has_any_permission(array['documents.read','company.update']))
;
create policy "tenant activity logs append" on public.activity_logs for insert to authenticated
  with check (company_id = public.current_staff_company_id() and created_by = public.current_staff_id());
create policy "tenant audit logs read" on public.audit_logs for select to authenticated
  using (company_id = public.current_staff_company_id() and public.has_any_permission(array['documents.read','company.update']))
;
create policy "tenant audit logs append" on public.audit_logs for insert to authenticated
  with check (company_id = public.current_staff_company_id() and changed_by = public.current_staff_id());

revoke update, delete on table public.activity_logs from authenticated;
revoke update, delete on table public.audit_logs from authenticated;
create policy "tenant attachments read" on public.attachments for select to authenticated
  using (company_id = public.current_staff_company_id() and public.has_permission('documents.read'));
create policy "tenant attachments manage" on public.attachments for all to authenticated
  using (company_id = public.current_staff_company_id() and public.has_permission('documents.attach'))
  with check (company_id = public.current_staff_company_id() and public.has_permission('documents.attach'));
create policy "tenant documents read" on public.documents for select to authenticated
  using (company_id = public.current_staff_company_id() and public.has_permission('documents.read'));
create policy "tenant documents manage" on public.documents for all to authenticated
  using (company_id = public.current_staff_company_id() and public.has_permission('documents.update'))
  with check (company_id = public.current_staff_company_id() and public.has_any_permission(array['documents.create','documents.update']));
create policy "tenant document comments" on public.document_comments for all to authenticated
  using (exists (select 1 from public.documents d where d.id = document_comments.document_id
    and d.company_id = public.current_staff_company_id() and public.has_permission('documents.read')))
  with check (exists (select 1 from public.documents d where d.id = document_comments.document_id
    and d.company_id = public.current_staff_company_id() and public.has_permission('documents.comment')));
create policy "tenant document revisions" on public.document_revisions for all to authenticated
  using (exists (select 1 from public.documents d where d.id = document_revisions.document_id
    and d.company_id = public.current_staff_company_id() and public.has_permission('documents.read')))
  with check (exists (select 1 from public.documents d where d.id = document_revisions.document_id
    and d.company_id = public.current_staff_company_id() and public.has_permission('documents.update')));
create policy "tenant approvals" on public.approvals for all to authenticated
  using (company_id = public.current_staff_company_id() and public.has_permission('documents.read'))
  with check (company_id = public.current_staff_company_id() and public.has_any_permission(array['documents.submit','documents.approve']));
create policy "tenant approval steps" on public.approval_steps for all to authenticated
  using (exists (select 1 from public.approvals a where a.id = approval_steps.approval_id
    and a.company_id = public.current_staff_company_id() and public.has_permission('documents.read')))
  with check (exists (select 1 from public.approvals a where a.id = approval_steps.approval_id
    and a.company_id = public.current_staff_company_id() and public.has_permission('documents.approve')));
create policy "tenant document sequences" on public.document_sequences for all to authenticated
  using (company_id = public.current_staff_company_id() and public.has_any_permission(array['document_sequences.read','document_sequences.update']))
  with check (company_id = public.current_staff_company_id() and public.has_any_permission(array['document_sequences.create','document_sequences.update']));
create policy "tenant document sequence periods" on public.document_sequence_periods for select to authenticated
  using (company_id = public.current_staff_company_id() and public.has_permission('document_sequences.read'));
create policy "tenant notifications own" on public.notifications for select to authenticated
  using (company_id = public.current_staff_company_id() and (
    recipient_user_id = auth.uid() or recipient_staff_id = public.current_staff_id() or staff_id = public.current_staff_id()
    or (recipient_role_id is not null and exists (select 1 from public.staff_roles sr where sr.staff_id = public.current_staff_id() and sr.role_id = notifications.recipient_role_id))
    or (branch_id is not null and public.can_access_company_branch(company_id, branch_id))
    or (is_company_wide and public.current_staff_has_company_role(array['super_admin','finance','manager','purchasing']))));
create policy "tenant notifications create" on public.notifications for insert to authenticated
  with check (company_id = public.current_staff_company_id() and actor_user_id = auth.uid());
create policy "tenant notification recipients own" on public.notification_recipients for all to authenticated
  using ((recipient_user_id = auth.uid() or recipient_staff_id = public.current_staff_id())
    and exists (select 1 from public.notifications n where n.id = notification_recipients.notification_id and n.company_id = public.current_staff_company_id()))
  with check ((recipient_user_id = auth.uid() or recipient_staff_id = public.current_staff_id())
    and exists (select 1 from public.notifications n where n.id = notification_recipients.notification_id and n.company_id = public.current_staff_company_id()));
create policy "tenant user preferences own" on public.user_preferences for all to authenticated
  using (company_id = public.current_staff_company_id() and user_id = auth.uid())
  with check (company_id = public.current_staff_company_id() and user_id = auth.uid());
create policy "tenant deletion tombstones read" on public.permanent_deletion_tombstones for select to authenticated
  using (company_id = public.current_staff_company_id() and public.has_permission('roles.update'));

-- Recipes and production derive child scope from the authoritative parent.
create policy "tenant recipes" on public.recipes for all to authenticated
  using (company_id = public.current_staff_company_id() and public.has_any_permission(array['recipes.read','recipes.update']))
  with check (company_id = public.current_staff_company_id()
    and public.has_any_permission(array['recipes.create','recipes.update'])
    and exists (select 1 from public.products p where p.id = recipes.product_id and p.company_id = recipes.company_id));
create policy "tenant recipe lines" on public.recipe_lines for all to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_lines.recipe_id
    and r.company_id = public.current_staff_company_id() and public.has_any_permission(array['recipes.read','recipes.update'])))
  with check (exists (select 1 from public.recipes r join public.items i on i.id = recipe_lines.ingredient_item_id
    where r.id = recipe_lines.recipe_id and r.company_id = public.current_staff_company_id()
      and i.company_id = r.company_id and public.has_any_permission(array['recipes.create','recipes.update'])));
create policy "tenant recipe snapshots" on public.recipe_cost_snapshots for all to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_cost_snapshots.recipe_id
    and r.company_id = public.current_staff_company_id() and public.has_permission('recipes.read')))
  with check (exists (select 1 from public.recipes r where r.id = recipe_cost_snapshots.recipe_id
    and r.company_id = public.current_staff_company_id() and public.has_any_permission(array['recipes.update','recipes.approve'])));
create policy "tenant production jobs" on public.production_jobs for all to authenticated
  using (public.can_access_company_branch(company_id, branch_id) and public.has_any_permission(array['production.view','production.create','production.approve','production.post']))
  with check (public.can_access_company_branch(company_id, branch_id)
    and public.has_any_permission(array['production.create','production.submit','production.approve','production.post','production.cancel','production.reject'])
    and exists (select 1 from public.locations l where l.id = production_jobs.location_id and l.company_id = production_jobs.company_id and l.branch_id = production_jobs.branch_id));
create policy "tenant production ingredients" on public.production_job_ingredient_lines for all to authenticated
  using (exists (select 1 from public.production_jobs j where j.id = production_job_ingredient_lines.production_job_id
    and public.can_access_company_branch(j.company_id, j.branch_id) and public.has_permission('production.view')))
  with check (exists (select 1 from public.production_jobs j join public.items i on i.id = production_job_ingredient_lines.item_id
    where j.id = production_job_ingredient_lines.production_job_id and i.company_id = j.company_id
      and public.can_access_company_branch(j.company_id, j.branch_id) and public.has_any_permission(array['production.create','production.post'])));
create policy "tenant production outputs" on public.production_job_output_lines for all to authenticated
  using (exists (select 1 from public.production_jobs j where j.id = production_job_output_lines.production_job_id
    and public.can_access_company_branch(j.company_id, j.branch_id) and public.has_permission('production.view')))
  with check (exists (select 1 from public.production_jobs j where j.id = production_job_output_lines.production_job_id
    and public.can_access_company_branch(j.company_id, j.branch_id) and public.has_any_permission(array['production.create','production.post'])
    and (production_job_output_lines.item_id is null or exists (select 1 from public.items i where i.id = production_job_output_lines.item_id and i.company_id = j.company_id))
    and (production_job_output_lines.product_id is null or exists (select 1 from public.products p where p.id = production_job_output_lines.product_id and p.company_id = j.company_id))));

-- Procurement and inventory headers are company/branch scoped; children always
-- derive through their parent and additionally validate master ownership.
create policy "tenant purchase requests" on public.purchase_requests for all to authenticated
  using (public.can_access_purchase_request(company_id, branch_id, requested_by))
  with check (company_id = public.current_staff_company_id() and public.can_access_company_branch(company_id, branch_id)
    and requested_by = public.current_staff_id() and public.has_any_permission(array['purchase_request.create','pr.create']));
create policy "tenant purchase request lines" on public.purchase_request_lines for all to authenticated
  using (exists (select 1 from public.purchase_requests pr where pr.id = purchase_request_lines.purchase_request_id
    and public.can_access_purchase_request(pr.company_id, pr.branch_id, pr.requested_by)))
  with check (exists (select 1 from public.purchase_requests pr join public.items i on i.id = purchase_request_lines.item_id
    where pr.id = purchase_request_lines.purchase_request_id and i.company_id = pr.company_id
      and pr.status::text = any(array['draft','rejected','returned'])
      and public.can_access_purchase_request(pr.company_id, pr.branch_id, pr.requested_by)
      and public.has_any_permission(array['purchase_request.update','purchase_request.create','pr.create'])
      and (purchase_request_lines.suggested_supplier_id is null or exists (select 1 from public.suppliers s where s.id = purchase_request_lines.suggested_supplier_id and s.company_id = pr.company_id))));
create policy "tenant purchase orders" on public.purchase_orders for all to authenticated
  using (public.can_access_company_branch(company_id, branch_id) and public.has_any_permission(array['purchase_order.read','purchase_order.create','purchase_order.update','purchase_order.approve','purchase_order.send']))
  with check (public.can_access_company_branch(company_id, branch_id)
    and public.has_any_permission(array['purchase_order.create','purchase_order.update','purchase_order.approve','purchase_order.send','purchase_order.cancel','purchase_order.close'])
    and exists (select 1 from public.suppliers s where s.id = purchase_orders.supplier_id and s.company_id = purchase_orders.company_id));
create policy "tenant purchase order lines" on public.purchase_order_lines for all to authenticated
  using (exists (select 1 from public.purchase_orders po where po.id = purchase_order_lines.purchase_order_id
    and public.can_access_company_branch(po.company_id, po.branch_id) and public.has_permission('purchase_order.read')))
  with check (exists (select 1 from public.purchase_orders po join public.items i on i.id = purchase_order_lines.item_id
    where po.id = purchase_order_lines.purchase_order_id and i.company_id = po.company_id
      and public.can_access_company_branch(po.company_id, po.branch_id) and public.has_any_permission(array['purchase_order.create','purchase_order.update'])));
create policy "tenant goods receivings" on public.goods_receivings for all to authenticated
  using (public.can_access_company_branch(company_id, branch_id) and public.has_any_permission(array['goods_receiving.read','goods_receiving.create','goods_receiving.update','goods_receiving.post']))
  with check (public.can_access_company_branch(company_id, branch_id)
    and public.has_any_permission(array['goods_receiving.create','goods_receiving.update','goods_receiving.post','goods_receiving.cancel'])
    and exists (select 1 from public.locations l where l.id = goods_receivings.location_id and l.company_id = goods_receivings.company_id and l.branch_id = goods_receivings.branch_id));
create policy "tenant goods receiving lines" on public.goods_receiving_lines for all to authenticated
  using (exists (select 1 from public.goods_receivings g where g.id = goods_receiving_lines.goods_receiving_id
    and public.can_access_company_branch(g.company_id, g.branch_id) and public.has_permission('goods_receiving.read')))
  with check (exists (select 1 from public.goods_receivings g join public.items i on i.id = goods_receiving_lines.item_id
    where g.id = goods_receiving_lines.goods_receiving_id and i.company_id = g.company_id
      and public.can_access_company_branch(g.company_id, g.branch_id) and public.has_any_permission(array['goods_receiving.create','goods_receiving.update'])));
create policy "tenant purchase returns" on public.purchase_returns for all to authenticated
  using (public.can_access_company_branch(company_id, branch_id) and public.has_any_permission(array['purchase_return.view','purchase_return.create','purchase_return.post']))
  with check (public.can_access_company_branch(company_id, branch_id)
    and public.has_any_permission(array['purchase_return.create','purchase_return.post','purchase_return.cancel'])
    and exists (select 1 from public.locations l where l.id = purchase_returns.location_id and l.company_id = purchase_returns.company_id and l.branch_id = purchase_returns.branch_id));
create policy "tenant purchase return lines" on public.purchase_return_lines for all to authenticated
  using (exists (select 1 from public.purchase_returns pr where pr.id = purchase_return_lines.purchase_return_id
    and public.can_access_company_branch(pr.company_id, pr.branch_id) and public.has_permission('purchase_return.view')))
  with check (exists (select 1 from public.purchase_returns pr join public.items i on i.id = purchase_return_lines.item_id
    where pr.id = purchase_return_lines.purchase_return_id and i.company_id = pr.company_id
      and public.can_access_company_branch(pr.company_id, pr.branch_id) and public.has_any_permission(array['purchase_return.create','purchase_return.post'])));
create policy "tenant stock counts" on public.stock_counts for all to authenticated
  using (public.can_access_company_branch(company_id, branch_id) and public.has_any_permission(array['stock_count.read','stock_count.create','stock_count.update','stock_count.approve','stock_count.post']))
  with check (public.can_access_company_branch(company_id, branch_id)
    and public.has_any_permission(array['stock_count.create','stock_count.update','stock_count.approve','stock_count.post'])
    and exists (select 1 from public.locations l where l.id = stock_counts.location_id and l.company_id = stock_counts.company_id and l.branch_id = stock_counts.branch_id));
create policy "tenant stock count lines" on public.stock_count_lines for all to authenticated
  using (exists (select 1 from public.stock_counts sc where sc.id = stock_count_lines.stock_count_id
    and public.can_access_company_branch(sc.company_id, sc.branch_id) and public.has_permission('stock_count.read')))
  with check (exists (select 1 from public.stock_counts sc join public.items i on i.id = stock_count_lines.item_id
    where sc.id = stock_count_lines.stock_count_id and i.company_id = sc.company_id
      and public.can_access_company_branch(sc.company_id, sc.branch_id) and public.has_any_permission(array['stock_count.create','stock_count.update'])));
create policy "tenant stock transactions read" on public.stock_transactions for select to authenticated
  using (exists (select 1 from public.branches b where b.id = stock_transactions.branch_id
    and public.can_access_company_branch(b.company_id, b.id) and public.has_permission('stock_transactions.read')));
create policy "tenant stock transaction lines read" on public.stock_transaction_lines for select to authenticated
  using (exists (select 1 from public.stock_transactions st join public.branches b on b.id = st.branch_id
    where st.id = stock_transaction_lines.stock_transaction_id and public.can_access_company_branch(b.company_id, b.id)
      and public.has_permission('stock_transactions.read')));
create policy "tenant stock transfers" on public.stock_transfers for all to authenticated
  using (company_id = public.current_staff_company_id()
    and (public.can_access_company_branch(company_id, from_branch_id) or public.can_access_company_branch(company_id, to_branch_id))
    and public.has_any_permission(array['stock_transfer.read','stock_transfer.create','stock_transfer.update','stock_transfer.post']))
  with check (company_id = public.current_staff_company_id()
    and public.can_access_company_branch(company_id, from_branch_id) and public.can_access_company_branch(company_id, to_branch_id)
    and public.has_any_permission(array['stock_transfer.create','stock_transfer.update','stock_transfer.post']));
create policy "tenant stock transfer lines" on public.stock_transfer_lines for all to authenticated
  using (exists (select 1 from public.stock_transfers st where st.id = stock_transfer_lines.stock_transfer_id
    and st.company_id = public.current_staff_company_id()
    and (public.can_access_company_branch(st.company_id, st.from_branch_id) or public.can_access_company_branch(st.company_id, st.to_branch_id))
    and public.has_permission('stock_transfer.read')))
  with check (exists (select 1 from public.stock_transfers st join public.items i on i.id = stock_transfer_lines.item_id
    where st.id = stock_transfer_lines.stock_transfer_id and i.company_id = st.company_id
      and public.can_access_company_branch(st.company_id, st.from_branch_id) and public.can_access_company_branch(st.company_id, st.to_branch_id)
      and public.has_any_permission(array['stock_transfer.create','stock_transfer.update'])));
create policy "tenant stock wastage" on public.stock_wastage for all to authenticated
  using (public.can_access_company_branch(company_id, branch_id) and public.has_any_permission(array['stock_wastage.read','stock_wastage.create','stock_wastage.update','stock_wastage.post']))
  with check (public.can_access_company_branch(company_id, branch_id) and public.has_any_permission(array['stock_wastage.create','stock_wastage.update','stock_wastage.post']));
create policy "tenant stock wastage lines" on public.stock_wastage_lines for all to authenticated
  using (exists (select 1 from public.stock_wastage sw where sw.id = stock_wastage_lines.stock_wastage_id
    and public.can_access_company_branch(sw.company_id, sw.branch_id) and public.has_permission('stock_wastage.read')))
  with check (exists (select 1 from public.stock_wastage sw join public.items i on i.id = stock_wastage_lines.item_id
    where sw.id = stock_wastage_lines.stock_wastage_id and i.company_id = sw.company_id
      and public.can_access_company_branch(sw.company_id, sw.branch_id) and public.has_any_permission(array['stock_wastage.create','stock_wastage.update'])));

-- Finance and outlet daily records.
create policy "tenant supplier invoices" on public.supplier_invoices for all to authenticated
  using (company_id = public.current_staff_company_id() and public.has_any_permission(array['supplier_invoice.view','supplier_invoice.create','supplier_invoice.pay']))
  with check (company_id = public.current_staff_company_id()
    and public.has_any_permission(array['supplier_invoice.create','supplier_invoice.pay'])
    and exists (select 1 from public.suppliers s where s.id = supplier_invoices.supplier_id and s.company_id = supplier_invoices.company_id));
create policy "tenant supplier invoice lines" on public.supplier_invoice_lines for select to authenticated
  using (exists (select 1 from public.supplier_invoices si where si.id = supplier_invoice_lines.supplier_invoice_id
    and si.company_id = public.current_staff_company_id() and public.has_permission('supplier_invoice.view')));
create policy "tenant supplier invoice payments" on public.supplier_invoice_payments for all to authenticated
  using (company_id = public.current_staff_company_id() and public.has_permission('supplier_invoice.pay'))
  with check (company_id = public.current_staff_company_id() and public.has_permission('supplier_invoice.pay')
    and exists (select 1 from public.supplier_invoices si where si.id = supplier_invoice_payments.supplier_invoice_id and si.company_id = supplier_invoice_payments.company_id));
create policy "tenant outlet daily records" on public.outlet_daily_records for select to authenticated
  using (public.can_access_company_branch(company_id, branch_id) and public.has_permission('outlet_daily_record.view'));
create policy "tenant outlet daily record lines" on public.outlet_daily_record_lines for select to authenticated
  using (exists (select 1 from public.outlet_daily_records r where r.id = outlet_daily_record_lines.record_id
    and public.can_access_company_branch(r.company_id, r.branch_id) and public.has_permission('outlet_daily_record.view')));

-- No anonymous business-table or function surface. Existing authenticated
-- table grants remain; RLS above is the authoritative object boundary.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke create on schema public from public, anon, authenticated;

-- Every SECURITY DEFINER function receives a fixed safe path and loses
-- default PUBLIC/anon execution. Existing explicit authenticated grants from
-- released migrations are preserved; the new functions are granted above.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    execute format('alter function %s set search_path = pg_catalog, public', fn.signature);
    execute format('revoke all on function %s from public, anon', fn.signature);
  end loop;
end $$;

-- Explicitly preserve the authenticated application RPC surface.
grant execute on function public.has_admin_staff_assignment() to authenticated;
grant execute on function public.bootstrap_first_admin() to authenticated;
grant execute on function public.has_any_permission(text[]) to authenticated;
grant execute on function public.get_allowed_permissions(text[]) to authenticated;
grant execute on function public.preview_phase_one_hard_delete(text, uuid) to authenticated;
grant execute on function public.hard_delete_phase_one(text, uuid, text) to authenticated;
grant execute on function public.get_ap_aging_report(text, uuid, text, text, date, date, boolean, integer, integer) to authenticated;
grant execute on function public.get_production_recipe_options() to authenticated;
grant execute on function public.save_outlet_daily_record(uuid, uuid, date, text, jsonb, text) to authenticated;
grant execute on function public.transition_outlet_daily_record(uuid, text, text) to authenticated;
grant execute on function public.save_supplier_invoice_draft(uuid, text, text, uuid, date, date, integer, numeric, text, jsonb) to authenticated;
grant execute on function public.approve_supplier_invoice(uuid) to authenticated;
grant execute on function public.record_supplier_invoice_payment(uuid, text, date, numeric, text, text, text, uuid) to authenticated;
grant execute on function public.void_supplier_invoice(uuid, text) to authenticated;
grant execute on function public.approve_stock_count_atomic(uuid) to authenticated;
grant execute on function public.post_stock_count_atomic(uuid) to authenticated;
grant execute on function public.post_goods_receiving_atomic(uuid, text) to authenticated;
grant execute on function public.post_purchase_return_atomic(uuid) to authenticated;
grant execute on function public.post_opening_stock(text, uuid, uuid, uuid, date, numeric, numeric, text) to authenticated;
grant execute on function public.post_opening_stock_batch(jsonb) to authenticated;
grant execute on function public.link_purchase_request_document(uuid, uuid) to authenticated;
grant execute on function public.update_draft_purchase_request(uuid, timestamptz, uuid, date, date, text, date, text, boolean, text, jsonb) to authenticated;
grant execute on function public.transition_purchase_request(uuid, text, text) to authenticated;
grant execute on function public.convert_purchase_request_to_purchase_order(uuid, text) to authenticated;
grant execute on function public.next_document_number(uuid, text) to authenticated;
grant execute on function public.set_role_permissions(uuid, uuid[]) to authenticated;
grant execute on function public.set_staff_permission_overrides(uuid, jsonb) to authenticated;
grant execute on function public.repair_staff_auth_link(uuid, uuid, text) to authenticated;
grant execute on function public.save_branch_supplier_item_mappings(jsonb, text) to authenticated;

-- Structural relationship guards also protect service-role and trigger paths.
create or replace function public.enforce_staff_role_tenant()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare staff_company uuid; role_company uuid; branch_company uuid;
begin
  select company_id into staff_company from public.staffs where id = new.staff_id;
  select company_id into role_company from public.roles where id = new.role_id;
  if staff_company is null or role_company is distinct from staff_company then
    raise exception 'Staff and role must belong to the same company.' using errcode = '23514';
  end if;
  if new.branch_id is not null then
    select company_id into branch_company from public.branches where id = new.branch_id;
    if branch_company is distinct from staff_company then
      raise exception 'Staff role branch must belong to the staff company.' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists enforce_staff_role_tenant on public.staff_roles;
create trigger enforce_staff_role_tenant before insert or update on public.staff_roles
for each row execute function public.enforce_staff_role_tenant();

create or replace function public.enforce_staff_branch_tenant()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if not exists (
    select 1 from public.staffs s join public.branches b on b.id = new.branch_id
    where s.id = new.staff_id and s.company_id = b.company_id
  ) then raise exception 'Staff and branch must belong to the same company.' using errcode = '23514'; end if;
  return new;
end $$;
drop trigger if exists enforce_staff_branch_tenant on public.staff_branches;
create trigger enforce_staff_branch_tenant before insert or update on public.staff_branches
for each row execute function public.enforce_staff_branch_tenant();

create or replace function public.enforce_staff_location_tenant()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if not exists (
    select 1 from public.staffs s join public.locations l on l.id = new.location_id
    where s.id = new.staff_id and s.company_id = l.company_id
  ) then raise exception 'Staff and location must belong to the same company.' using errcode = '23514'; end if;
  return new;
end $$;
drop trigger if exists enforce_staff_location_tenant on public.staff_locations;
create trigger enforce_staff_location_tenant before insert or update on public.staff_locations
for each row execute function public.enforce_staff_location_tenant();

create or replace function public.enforce_branch_supplier_item_tenant()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if not exists (
    select 1 from public.branches b join public.supplier_items si on si.id = new.supplier_item_id
    where b.id = new.branch_id and si.company_id = b.company_id and si.item_id = new.item_id
  ) then raise exception 'Branch supplier mapping must stay inside one company.' using errcode = '23514'; end if;
  return new;
end $$;
drop trigger if exists enforce_branch_supplier_item_tenant on public.branch_supplier_items;
create trigger enforce_branch_supplier_item_tenant before insert or update on public.branch_supplier_items
for each row execute function public.enforce_branch_supplier_item_tenant();

do $$ begin
  if exists (select 1 from public.staff_roles sr join public.staffs s on s.id=sr.staff_id join public.roles r on r.id=sr.role_id where s.company_id is distinct from r.company_id)
    or exists (select 1 from public.staff_branches sb join public.staffs s on s.id=sb.staff_id join public.branches b on b.id=sb.branch_id where s.company_id is distinct from b.company_id)
    or exists (select 1 from public.staff_locations sl join public.staffs s on s.id=sl.staff_id join public.locations l on l.id=sl.location_id where s.company_id is distinct from l.company_id)
    or exists (select 1 from public.branch_supplier_items bsi join public.branches b on b.id=bsi.branch_id join public.supplier_items si on si.id=bsi.supplier_item_id where b.company_id is distinct from si.company_id or bsi.item_id is distinct from si.item_id)
  then raise exception 'Existing access or supplier mappings cross company boundaries.' using errcode = '23514'; end if;
end $$;

revoke all on function public.enforce_staff_role_tenant() from public, anon, authenticated;
revoke all on function public.enforce_staff_branch_tenant() from public, anon, authenticated;
revoke all on function public.enforce_staff_location_tenant() from public, anon, authenticated;
revoke all on function public.enforce_branch_supplier_item_tenant() from public, anon, authenticated;

create or replace function public.enforce_master_relationship_tenant()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  owner_company uuid;
begin
  if tg_table_name = 'barcode_mappings' then
    if new.item_id is not null and not exists (select 1 from public.items where id = new.item_id and company_id = new.company_id) then
      raise exception 'Barcode mapping item must belong to the same company.' using errcode = '23514';
    end if;
    if new.product_id is not null and not exists (select 1 from public.products where id = new.product_id and company_id = new.company_id) then
      raise exception 'Barcode mapping product must belong to the same company.' using errcode = '23514';
    end if;
  elsif tg_table_name = 'recipes' then
    if not exists (select 1 from public.products where id = new.product_id and company_id = new.company_id) then
      raise exception 'Recipe product must belong to the same company.' using errcode = '23514';
    end if;
  elsif tg_table_name = 'recipe_lines' then
    select company_id into owner_company from public.recipes where id = new.recipe_id;
    if owner_company is null or not exists (select 1 from public.items where id = new.ingredient_item_id and company_id = owner_company) then
      raise exception 'Recipe ingredient must belong to the recipe company.' using errcode = '23514';
    end if;
  elsif tg_table_name = 'product_packaging' then
    if not exists (select 1 from public.products where id = new.product_id) then
      raise exception 'Packaging product was not found.' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists enforce_barcode_mapping_tenant on public.barcode_mappings;
create trigger enforce_barcode_mapping_tenant before insert or update on public.barcode_mappings
for each row execute function public.enforce_master_relationship_tenant();
drop trigger if exists enforce_recipe_tenant on public.recipes;
create trigger enforce_recipe_tenant before insert or update on public.recipes
for each row execute function public.enforce_master_relationship_tenant();
drop trigger if exists enforce_recipe_line_tenant on public.recipe_lines;
create trigger enforce_recipe_line_tenant before insert or update on public.recipe_lines
for each row execute function public.enforce_master_relationship_tenant();
drop trigger if exists enforce_product_packaging_tenant on public.product_packaging;
create trigger enforce_product_packaging_tenant before insert or update on public.product_packaging
for each row execute function public.enforce_master_relationship_tenant();

revoke all on function public.enforce_master_relationship_tenant() from public, anon, authenticated;
