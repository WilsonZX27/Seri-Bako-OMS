-- Recipe header, lines, document, costing and audit commit together.
create table public.recipe_write_requests (
  company_id uuid not null references public.companies(id),
  request_key uuid not null,
  actor_id uuid not null references public.staffs(id),
  request jsonb not null,
  recipe_id uuid not null references public.recipes(id),
  created_at timestamptz not null default now(),
  primary key (company_id, request_key)
);
alter table public.recipe_write_requests enable row level security;
revoke all on public.recipe_write_requests from public, anon, authenticated;

create or replace function public.save_recipe_atomic(p_action text, p_request_key uuid, p_recipe_id uuid default null, p_payload jsonb default '{}'::jsonb, p_expected_updated_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  actor public.staffs%rowtype; old public.recipes%rowtype; saved public.recipes%rowtype;
  prior public.recipe_write_requests%rowtype; pack public.product_packaging%rowtype;
  request jsonb; body jsonb; lines jsonb; product uuid; doc uuid; rev integer; ver integer;
  recipe_number text; qty numeric; total_cost numeric; adjusted_cost numeric; snapshot integer;
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or actor.company_id is null then raise exception 'An active staff profile is required.'; end if;
  if p_action not in ('create','update','copy') or p_action is null then raise exception 'Unsupported recipe write.'; end if;
  if not public.has_permission(case when p_action='update' then 'recipes.update' else 'recipes.create' end) then raise exception 'Missing recipe permission.'; end if;
  if p_request_key is null then raise exception 'A recipe request key is required.'; end if;
  if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>1048576 then raise exception 'Invalid recipe payload.'; end if;
  request:=jsonb_build_object('action',p_action,'id',p_recipe_id,'payload',p_payload,'expected',p_expected_updated_at);
  -- One lock order covers request replay, product versions and snapshot allocation.
  perform pg_advisory_xact_lock(hashtextextended('recipe-writes:'||actor.company_id::text,0));
  select * into prior from public.recipe_write_requests where company_id=actor.company_id and request_key=p_request_key;
  if found then
    if prior.actor_id<>actor.id or prior.request<>request then raise exception 'Recipe request key was already used for different inputs.'; end if;
    return jsonb_build_object('id',prior.recipe_id,'already_applied',true);
  end if;
  body:=p_payload;
  if p_action in ('update','copy') then
    select * into old from public.recipes where id=p_recipe_id and company_id=actor.company_id and deleted_at is null for update;
    if old.id is null then raise exception 'Recipe was not found in your company.'; end if;
    if p_action='update' then
      if old.status in ('active','archived') then raise exception 'Active and archived recipes cannot be edited.'; end if;
      if p_expected_updated_at is null or old.updated_at<>p_expected_updated_at then raise exception 'Recipe changed. Reload before saving.'; end if;
    else
      if old.status<>'active' then raise exception 'Only an active recipe can be copied to a new version.'; end if;
      select jsonb_agg(jsonb_build_object('ingredient_item_id',ingredient_item_id,'qty_required',qty_required,'recipe_uom',recipe_uom,'base_uom',base_uom,'conversion_factor',conversion_factor,'base_qty_required',base_qty_required,'wastage_percent',wastage_percent,'cost_per_unit',cost_per_unit,'remarks',remarks) order by id) into lines from public.recipe_lines where recipe_id=old.id;
      body:=jsonb_build_object('product_id',old.product_id,'yield_qty',old.yield_qty,'yield_unit',old.yield_unit,'effective_date',current_date,'remarks','New version copied from '||old.recipe_no||'.','lines',lines);
    end if;
  end if;
  product:=(body->>'product_id')::uuid; qty:=(body->>'yield_qty')::numeric; lines:=body->'lines';
  if qty is null or qty not between 0.0001 and 1000000 or length(btrim(coalesce(body->>'yield_unit',''))) not between 1 and 32 or length(coalesce(body->>'remarks',''))>2000 or coalesce(body->>'effective_date','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid recipe header.'; end if;
  perform 1 from public.products where id=product and company_id=actor.company_id and status='active' and deleted_at is null for share;
  if not found then raise exception 'Product is unavailable in your company.'; end if;
  if jsonb_typeof(lines) is distinct from 'array' or jsonb_array_length(lines) not between 1 and 500 then raise exception 'Recipe needs 1 to 500 ingredients.'; end if;
  if exists(select 1 from jsonb_to_recordset(lines) x(ingredient_item_id uuid,qty_required numeric,recipe_uom text,base_uom text,conversion_factor numeric,base_qty_required numeric,wastage_percent numeric,cost_per_unit numeric,remarks text)
    where ingredient_item_id is null or qty_required is null or qty_required not between 0.0001 and 1000000 or base_qty_required is null or base_qty_required not between 0.0001 and 1000000 or conversion_factor is null or conversion_factor not between 0.000001 and 1000000 or wastage_percent is null or wastage_percent not between 0 and 100 or cost_per_unit is null or cost_per_unit not between 0 and 1000000000 or length(btrim(coalesce(recipe_uom,''))) not between 1 and 32 or length(btrim(coalesce(base_uom,''))) not between 1 and 32 or length(coalesce(remarks,''))>2000)
    or (select count(distinct x->>'ingredient_item_id') from jsonb_array_elements(lines) x)<>jsonb_array_length(lines) then raise exception 'Invalid or duplicate recipe ingredients.'; end if;
  -- Lock reference rows until commit, so a concurrent archive cannot pass validation then invalidate the save.
  perform 1 from public.items where id in(select (x->>'ingredient_item_id')::uuid from jsonb_array_elements(lines) x) and company_id=actor.company_id and status='active' and deleted_at is null order by id for share;
  if (select count(*) from public.items where id in(select (x->>'ingredient_item_id')::uuid from jsonb_array_elements(lines) x) and company_id=actor.company_id and status='active' and deleted_at is null)<>jsonb_array_length(lines) then raise exception 'Ingredient is unavailable in your company.'; end if;
  if p_action='update' then
    ver:=(body->>'version')::integer;
    if ver is null or ver not between 1 and 10000 then raise exception 'Invalid recipe version.'; end if;
    recipe_number:=body->>'recipe_no';
    if length(btrim(coalesce(recipe_number,''))) not between 1 and 64 then raise exception 'Invalid recipe number.'; end if;
    update public.recipes set product_id=product,version=ver,recipe_no=recipe_number,yield_qty=qty,yield_unit=body->>'yield_unit',effective_date=(body->>'effective_date')::date,remarks=body->>'remarks',remark=body->>'remarks',updated_by=actor.id where id=old.id returning * into saved;
  else
    select coalesce(max(version),0)+1 into ver from public.recipes where product_id=product;
    recipe_number:='RCP-'||replace(p_request_key::text,'-','');
    insert into public.recipes(company_id,product_id,version,recipe_no,yield_qty,yield_unit,effective_date,remarks,remark,status,approval_status,created_by,updated_by)
      values(actor.company_id,product,ver,recipe_number,qty,body->>'yield_unit',(body->>'effective_date')::date,body->>'remarks',body->>'remarks','draft','draft',actor.id,actor.id) returning * into saved;
  end if;
  doc:=saved.document_id;
  if doc is null then
    insert into public.documents(company_id,document_no,document_type,title,status,approval_status,current_step,related_entity_type,related_entity_id,created_by,updated_by)
    values(actor.company_id,recipe_number,'recipe','Recipe '||recipe_number,case when p_action='update' then old.status::text::public.document_status else 'draft'::public.document_status end,case when p_action='update' then old.approval_status else 'draft'::public.approval_status end,case when p_action='update' then old.status::text else 'Draft recipe' end,'recipe',saved.id,actor.id,actor.id) returning id,revision_no into doc,rev;
    update public.recipes set document_id=doc where id=saved.id;
  else
    update public.documents set document_no=recipe_number,title='Recipe '||recipe_number,revision_no=revision_no+1,updated_by=actor.id where id=doc and company_id=actor.company_id returning revision_no into rev;
    if not found then raise exception 'Linked recipe document is unavailable.'; end if;
  end if;
  insert into public.document_revisions(document_id,revision_no,change_summary,changed_by) values(doc,rev,'Recipe '||p_action||' saved atomically.',actor.id);
  delete from public.recipe_lines where recipe_id=saved.id;
  insert into public.recipe_lines(recipe_id,ingredient_item_id,qty_required,unit,recipe_uom,base_uom,conversion_factor,base_qty_required,wastage_percent,cost_per_unit,remarks)
    select saved.id,x.ingredient_item_id,x.qty_required,x.recipe_uom,x.recipe_uom,x.base_uom,x.conversion_factor,x.base_qty_required,x.wastage_percent,x.cost_per_unit,x.remarks from jsonb_to_recordset(lines) x(ingredient_item_id uuid,qty_required numeric,recipe_uom text,base_uom text,conversion_factor numeric,base_qty_required numeric,wastage_percent numeric,cost_per_unit numeric,remarks text);
  select sum(x.base_qty_required*x.cost_per_unit),sum(x.base_qty_required*x.cost_per_unit*(1+x.wastage_percent/100)) into total_cost,adjusted_cost from jsonb_to_recordset(lines) x(base_qty_required numeric,cost_per_unit numeric,wastage_percent numeric);
  select * into pack from public.product_packaging where product_id=product and status='active' and deleted_at is null order by id limit 1 for share;
  select coalesce(max(snapshot_no),0)+1 into snapshot from public.recipe_cost_snapshots where recipe_id=saved.id;
  insert into public.recipe_cost_snapshots(recipe_id,snapshot_no,total_ingredient_cost,wastage_adjusted_cost,cost_per_finished_unit,cost_per_pack,packaging_name,yield_qty,yield_uom,captured_by,created_by)
    values(saved.id,snapshot,total_cost,adjusted_cost,adjusted_cost/qty,case when pack.id is not null then adjusted_cost/qty*pack.units_per_pack end,pack.packaging_name,qty,body->>'yield_unit',actor.id,actor.id);
  insert into public.activity_logs(company_id,entity_type,entity_id,activity_type,message,metadata,created_by)
    values(actor.company_id,'document',doc,case when p_action='update' then 'updated' else 'created' end,'Recipe '||recipe_number||' saved',jsonb_build_object('recipe_id',saved.id,'action',p_action),actor.id);
  insert into public.recipe_write_requests(company_id,request_key,actor_id,request,recipe_id) values(actor.company_id,p_request_key,actor.id,request,saved.id);
  return jsonb_build_object('id',saved.id,'already_applied',false);
end;
$$;
revoke all on function public.save_recipe_atomic(text,uuid,uuid,jsonb,timestamptz) from public,anon;
grant execute on function public.save_recipe_atomic(text,uuid,uuid,jsonb,timestamptz) to authenticated;
