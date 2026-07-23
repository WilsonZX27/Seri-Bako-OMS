-- Migration 099 removed the Location relation. Rebind the retained internal
-- staff-access implementation to the Branch-only data model.

create or replace function public.replace_staff_access_atomic_unlocked(
  p_staff_id uuid, p_role_id uuid, p_default_branch_id uuid,
  p_accessible_branch_ids uuid[] default '{}'::uuid[],
  p_status public.record_status default null, p_staff_code text default null,
  p_full_name text default null, p_email text default null, p_phone text default null
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare actor record; target record; selected_role record; actor_is_owner boolean;
  target_was_owner boolean; company_wide boolean; requested_branch_ids uuid[];
  eligible_branch_ids uuid[]; invalid_count integer; remaining_owner_count integer;
begin
  select s.id,s.company_id into actor from public.staffs s where s.auth_user_id=auth.uid() and s.status='active' and s.deleted_at is null for update;
  if actor.id is null or not public.has_permission('staffs.update') then raise exception 'Active staff with staffs.update permission required.' using errcode='42501'; end if;
  select s.id,s.company_id into target from public.staffs s where s.id=p_staff_id and s.company_id=actor.company_id and s.deleted_at is null for update;
  if target.id is null then raise exception 'Target staff was not found in your company.' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('owner:'||actor.company_id::text,0));
  select r.id,r.role_code into selected_role from public.roles r where r.id=p_role_id and r.company_id=actor.company_id and r.status='active' and r.deleted_at is null;
  if selected_role.id is null then raise exception 'Selected role was not found in your company.' using errcode='42501'; end if;
  actor_is_owner:=public.current_staff_has_company_role(array['super_admin']);
  select exists(select 1 from public.staff_roles sr join public.roles r on r.id=sr.role_id where sr.staff_id=p_staff_id and r.company_id=actor.company_id and r.role_code='super_admin' and r.status='active' and r.deleted_at is null and (sr.effective_from is null or sr.effective_from<=current_date) and (sr.effective_to is null or sr.effective_to>=current_date)) into target_was_owner;
  if (selected_role.role_code='super_admin' or target_was_owner) and not actor_is_owner then raise exception 'Only an Owner can assign or change an Owner role.' using errcode='42501'; end if;
  if target_was_owner and (selected_role.role_code<>'super_admin' or coalesce(p_status,'active'::public.record_status)<>'active'::public.record_status) then
    select count(distinct s.id) into remaining_owner_count from public.staffs s join public.staff_roles sr on sr.staff_id=s.id join public.roles r on r.id=sr.role_id and r.company_id=s.company_id where s.company_id=actor.company_id and s.id<>p_staff_id and s.status='active' and s.deleted_at is null and r.role_code='super_admin' and r.status='active' and r.deleted_at is null and (sr.effective_from is null or sr.effective_from<=current_date) and (sr.effective_to is null or sr.effective_to>=current_date);
    if remaining_owner_count=0 then raise exception 'Cannot remove the last Owner in this company.' using errcode='23514'; end if;
  end if;
  company_wide:=selected_role.role_code=any(array['super_admin','finance','manager','purchasing']);
  requested_branch_ids:=array(select distinct x from unnest(coalesce(p_accessible_branch_ids,'{}'::uuid[])||array[p_default_branch_id]) x where x is not null);
  select count(*) into invalid_count from unnest(requested_branch_ids) requested(id) left join public.branches b on b.id=requested.id and b.company_id=actor.company_id and b.status='active' and b.deleted_at is null where b.id is null or (selected_role.role_code='kitchen' and b.branch_type<>'central_kitchen') or (selected_role.role_code='outlet_staff' and b.branch_type<>'outlet');
  if invalid_count>0 then raise exception 'One or more branch IDs are not eligible in your company.' using errcode='42501'; end if;
  if company_wide then select array_agg(b.id order by b.id) into eligible_branch_ids from public.branches b where b.company_id=actor.company_id and b.status='active' and b.deleted_at is null; else eligible_branch_ids:=requested_branch_ids; end if;
  if p_default_branch_id is null or not(p_default_branch_id=any(coalesce(eligible_branch_ids,'{}'::uuid[]))) then raise exception 'Default branch is not eligible for the selected role.' using errcode='23514'; end if;
  delete from public.staff_branches where staff_id=p_staff_id;
  delete from public.staff_roles where staff_id=p_staff_id;
  insert into public.staff_roles(staff_id,role_id,branch_id,is_primary,effective_from,effective_to) values(p_staff_id,p_role_id,case when company_wide then null else p_default_branch_id end,true,current_date,null);
  insert into public.staff_branches(staff_id,branch_id,access_level,is_default) select p_staff_id,b.id,case when selected_role.role_code='super_admin' then 'full'::public.staff_access_level when company_wide then 'manage'::public.staff_access_level else 'read_only'::public.staff_access_level end,b.id=p_default_branch_id from public.branches b where b.id=any(eligible_branch_ids);
  update public.staffs set default_branch_id=p_default_branch_id,status=coalesce(p_status,status),staff_code=coalesce(p_staff_code,staff_code),full_name=coalesce(p_full_name,full_name),email=coalesce(p_email,email),phone=p_phone,invite_email=coalesce(p_email,invite_email),updated_at=now() where id=p_staff_id and company_id=actor.company_id;
  return jsonb_build_object('staff_id',p_staff_id,'role_code',selected_role.role_code,'branch_count',coalesce(cardinality(eligible_branch_ids),0));
end $$;

revoke all on function public.replace_staff_access_atomic_unlocked(uuid,uuid,uuid,uuid[],public.record_status,text,text,text,text) from public, anon, authenticated;
revoke all on function public.create_purchase_request_atomic(jsonb), public.create_purchase_order_atomic(jsonb), public.create_goods_receiving_atomic(jsonb), public.create_purchase_return_atomic(jsonb), public.create_production_job_atomic(jsonb), public.create_stock_transfer_atomic(jsonb), public.create_stock_wastage_atomic(jsonb) from public, anon;
grant execute on function public.create_purchase_request_atomic(jsonb), public.create_purchase_order_atomic(jsonb), public.create_goods_receiving_atomic(jsonb), public.create_purchase_return_atomic(jsonb), public.create_production_job_atomic(jsonb), public.create_stock_transfer_atomic(jsonb), public.create_stock_wastage_atomic(jsonb) to authenticated;
revoke all on function public.transition_document_atomic(uuid,text,text) from anon;

create or replace function public.update_draft_purchase_request(
  target_purchase_request_id uuid, expected_updated_at timestamptz, submitted_branch_id uuid,
  request_date_value date, required_date_value date, priority_value text, needed_by_date_value date,
  urgency_reason_value text, production_risk_value boolean, remarks_value text, lines_value jsonb
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.staffs%rowtype; request_row public.purchase_requests%rowtype; line_count integer;
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_any_permission(array['purchase_request.create','pr.create']) then raise exception 'You do not have permission to edit purchase request drafts.'; end if;
  select * into request_row from public.purchase_requests where id=target_purchase_request_id and deleted_at is null for update;
  if request_row.id is null then raise exception 'Purchase request not found.'; end if;
  if request_row.company_id is distinct from actor.company_id or not public.can_access_purchase_request(request_row.company_id,request_row.branch_id,request_row.requested_by) then raise exception 'You do not have access to this purchase request.'; end if;
  if request_row.status::text<>'draft' then raise exception 'Only draft purchase requests can be edited.'; end if;
  if request_row.updated_at is distinct from expected_updated_at then raise exception 'This draft changed after you opened it. Refresh before saving again.'; end if;
  if request_row.branch_id is null or submitted_branch_id is distinct from request_row.branch_id then raise exception 'The purchase request branch cannot be changed while editing a draft.'; end if;
  if jsonb_typeof(lines_value)<>'array' or jsonb_array_length(lines_value)=0 then raise exception 'Purchase request must have at least one line.'; end if;
  if priority_value not in ('low','normal','urgent','critical') then raise exception 'Invalid priority.'; end if;
  select count(*) into line_count from jsonb_array_elements(lines_value);
  if exists(select 1 from jsonb_to_recordset(lines_value) as line(item_id uuid) group by line.item_id having count(*)>1) then raise exception 'Each item can appear only once in a purchase request.'; end if;
  if exists(select 1 from jsonb_to_recordset(lines_value) as line(branch_id uuid) where line.branch_id is distinct from request_row.branch_id) then raise exception 'Mixed-branch purchase request lines are not allowed.'; end if;
  if exists(select 1 from jsonb_to_recordset(lines_value) as line(item_id uuid,branch_id uuid) left join public.items item on item.id=line.item_id and item.status='active' and item.deleted_at is null where item.id is null or not exists(select 1 from public.stock_balances_view balance where balance.item_id=line.item_id and balance.branch_id=request_row.branch_id)) then raise exception 'All selected items must be active and available to the purchase request branch.'; end if;
  update public.purchase_requests set request_date=request_date_value,required_date=required_date_value,priority=priority_value,needed_by_date=needed_by_date_value,urgency_reason=nullif(trim(urgency_reason_value),''),production_risk=coalesce(production_risk_value,false),branch_id=request_row.branch_id,remarks=nullif(trim(remarks_value),''),updated_by=actor.id where id=request_row.id;
  delete from public.purchase_request_lines where purchase_request_id=request_row.id;
  insert into public.purchase_request_lines(purchase_request_id,item_id,qty,uom,estimated_unit_cost,suggested_supplier_id,reason,remarks)
  select request_row.id,line.item_id,line.qty,trim(line.uom),line.estimated_unit_cost,line.suggested_supplier_id,nullif(trim(line.reason),''),nullif(trim(line.remarks),'') from jsonb_to_recordset(lines_value) as line(item_id uuid,qty numeric,uom text,estimated_unit_cost numeric,suggested_supplier_id uuid,reason text,remarks text,branch_id uuid);
  return jsonb_build_object('id',request_row.id,'request_no',request_row.request_no,'line_count',line_count);
end $$;

revoke all on function public.update_draft_purchase_request(uuid,timestamptz,uuid,date,date,text,date,text,boolean,text,jsonb) from public,anon;
grant execute on function public.update_draft_purchase_request(uuid,timestamptz,uuid,date,date,text,date,text,boolean,text,jsonb) to authenticated;
