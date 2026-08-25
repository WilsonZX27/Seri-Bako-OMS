-- Close executable schema defects found by `supabase db lint --level warning`.
do $$
declare d text; original text;
begin
  select pg_get_functiondef('public.preview_phase_one_hard_delete_v057(text,uuid)'::regprocedure) into d; original := d;
  d := replace(d, 'select count(*) into c from production_job_lines where item_id=record_id;', 'select (select count(*) from public.production_job_ingredient_lines where item_id=record_id) + (select count(*) from public.production_job_output_lines where item_id=record_id) into c;');
  if d = original and position('production_job_ingredient_lines' in d) = 0 then raise exception 'Legacy hard-delete preview repair pattern was not found.'; end if;
  if d <> original then execute d; end if;
end $$;

do $$
declare d text; original text;
begin
  select pg_get_functiondef('public.bootstrap_first_admin(uuid)'::regprocedure) into d; original := d;
  d := replace(d, '  main_location_id uuid;' || chr(10), '');
  d := regexp_replace(d, E'\\n  insert into public\\.locations[\\s\\S]*?\\n  insert into public\\.roles', chr(10) || '  insert into public.roles');
  d := regexp_replace(d, E'\\n  insert into public\\.staff_locations[\\s\\S]*?\\n  insert into public\\.role_permissions', chr(10) || '  insert into public.role_permissions');
  if d = original or position('public.locations' in d) > 0 or position('main_location_id' in d) > 0 then raise exception 'Bootstrap branch-only repair did not remove every obsolete location dependency.'; end if; execute d;
end $$;

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
  d := replace(d, '  branch_id uuid;' || chr(10), '  v_branch_id uuid;' || chr(10));
  d := replace(d, 'foreach branch_id in array', 'foreach v_branch_id in array');
  d := replace(d, 'branch_supplier_items.branch_id = branch_id', 'branch_supplier_items.branch_id = v_branch_id');
  d := replace(d, 'values (branch_id, created_supplier_item_id', 'values (v_branch_id, created_supplier_item_id');
  if d = original then raise exception 'Operational item branch ambiguity repair pattern was not found.'; end if; execute d;
end $$;

do $$
declare d text; original text;
begin
  select pg_get_functiondef('public.record_system_incident(text,text,text,text,text,uuid,text,uuid,text,text)'::regprocedure) into d; original := d;
  d := replace(d, '      entity_type, entity_id, created_by' || chr(10), '      entity_type, entity_id' || chr(10));
  d := replace(d, '      ''system_incident'', v_incident.id, v_staff_id' || chr(10), '      ''system_incident'', v_incident.id' || chr(10));
  if d = original or position('created_by' in d) > 0 then raise exception 'Incident notification column repair pattern was not found.'; end if; execute d;
end $$;

notify pgrst, 'reload schema';
