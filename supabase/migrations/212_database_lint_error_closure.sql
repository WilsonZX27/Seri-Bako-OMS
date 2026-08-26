-- Close executable schema defects found by `supabase db lint --level warning`.
do $$
declare d text; original text;
begin
  select pg_get_functiondef('public.preview_phase_one_hard_delete_v057(text,uuid)'::regprocedure) into d; original := d;
  d := replace(d, 'select count(*) into c from production_job_lines where item_id=record_id;', 'select (select count(*) from public.production_job_ingredient_lines where item_id=record_id) + (select count(*) from public.production_job_output_lines where item_id=record_id) into c;');
  if d = original and position('production_job_ingredient_lines' in d) = 0 then raise exception 'Legacy hard-delete preview repair pattern was not found.'; end if;
  if d <> original then execute d; end if;
end $$;

-- Keep the first-owner bootstrap deterministic. Rewriting pg_get_functiondef()
-- with whitespace-sensitive regular expressions made clean resets dependent on
-- the PostgreSQL formatter. This definition intentionally preserves the
-- service-role guard and branch bootstrap while removing obsolete locations.
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
  staff_row public.staffs%rowtype;
  owner_role_row public.roles%rowtype;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'Bootstrap is available only through the authorized server provisioning path.' using errcode = '42501';
  end if;
  if current_user_id is null or not exists (select 1 from auth.users where id = current_user_id) then
    raise exception 'The authorized provisioning path must identify the first Owner.' using errcode = '42501';
  end if;

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

do $$
declare d text; original text;
begin
  select pg_get_functiondef('public.create_production_job_atomic(jsonb)'::regprocedure) into d; original := d;
  d := replace(d, 'branch_id uuid:=', 'v_branch_id uuid:='); d := replace(d, 'recipe_id uuid:=', 'v_recipe_id uuid:=');
  d := replace(d, 'branch_id is null or recipe_id is null', 'v_branch_id is null or v_recipe_id is null');
  d := replace(d, 'actor.company_id,branch_id)', 'actor.company_id,v_branch_id)');
  d := replace(d, 'where id=branch_id and company_id=actor.company_id', 'where id=v_branch_id and company_id=actor.company_id');
  d := replace(d, 'where r.id=recipe_id and', 'where r.id=v_recipe_id and');
  d := replace(d, 'values(job_id,actor.company_id,branch_id,job_no', 'values(job_id,actor.company_id,v_branch_id,job_no');
  d := replace(d, 'where recipe_id=recipe.id)', 'where public.recipe_lines.recipe_id=recipe.id)');
  d := replace(d, 'and branch_id=branch_id and status=', 'and public.stock_transactions.branch_id=v_branch_id and status=');
  if d = original then raise exception 'Production Job ambiguity repair pattern was not found.'; end if; execute d;
end $$;

do $$
declare d text; original text;
begin
  select pg_get_functiondef('public.create_operational_item(jsonb,jsonb,uuid[],boolean)'::regprocedure) into d; original := d;
  d := regexp_replace(d, E'\\n[[:space:]]*branch_id uuid;', chr(10) || '  v_branch_id uuid;');
  d := replace(d, 'foreach branch_id in array', 'foreach v_branch_id in array');
  d := replace(d, 'branch_supplier_items.branch_id = branch_id', 'branch_supplier_items.branch_id = v_branch_id');
  d := replace(d, 'values (branch_id, created_supplier_item_id', 'values (v_branch_id, created_supplier_item_id');
  if d = original or position('v_branch_id uuid;' in d) = 0 then raise exception 'Operational item branch ambiguity repair pattern was not found.'; end if; execute d;
end $$;

do $$
declare d text; original text;
begin
  select pg_get_functiondef('public.record_system_incident(text,text,text,text,text,uuid,text,uuid,text,text)'::regprocedure) into d; original := d;
  d := regexp_replace(d, 'entity_type,[[:space:]]*entity_id,[[:space:]]*created_by', 'entity_type, entity_id');
  d := regexp_replace(d, '''system_incident'',[[:space:]]*v_incident.id,[[:space:]]*v_staff_id', '''system_incident'', v_incident.id');
  if d = original or position('created_by' in d) > 0 then raise exception 'Incident notification column repair pattern was not found.'; end if; execute d;
end $$;

notify pgrst, 'reload schema';
