-- Allow the original submitter to correct rejected or returned requests without
-- changing their workflow status. Super Admin retains audited recovery access.
create or replace function public.update_draft_purchase_request(
  target_purchase_request_id uuid,
  expected_updated_at timestamptz,
  submitted_branch_id uuid,
  request_date_value date,
  required_date_value date,
  priority_value text,
  needed_by_date_value date,
  urgency_reason_value text,
  production_risk_value boolean,
  remarks_value text,
  lines_value jsonb
) returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
  actor public.staffs%rowtype;
  request_row public.purchase_requests%rowtype;
  resolved_lines jsonb;
  unresolved_lines jsonb;
  line_count integer;
begin
  select * into actor
  from public.staffs
  where auth_user_id=auth.uid() and status='active' and deleted_at is null
  limit 1;
  if actor.id is null or not public.has_any_permission(array['purchase_request.create','pr.create']) then
    raise exception 'You do not have permission to edit this purchase request.';
  end if;
  select * into request_row
  from public.purchase_requests
  where id=target_purchase_request_id and deleted_at is null
  for update;
  if request_row.id is null then raise exception 'Purchase request not found.'; end if;
  if request_row.company_id is distinct from actor.company_id
    or not public.can_access_purchase_request(request_row.company_id,request_row.branch_id,request_row.requested_by) then
    raise exception 'You do not have access to this purchase request.';
  end if;
  if request_row.status::text not in ('draft','rejected','returned') then raise exception 'Only draft, rejected, or returned purchase requests can be edited.'; end if;
  if request_row.requested_by is distinct from actor.id and not exists (
    select 1
    from public.staff_roles staff_role
    join public.roles role_row on role_row.id=staff_role.role_id
    where staff_role.staff_id=actor.id
      and staff_role.effective_from<=current_date
      and (staff_role.effective_to is null or staff_role.effective_to>=current_date)
      and role_row.role_code='super_admin'
      and role_row.status='active'
      and role_row.deleted_at is null
  ) then raise exception 'Only the original submitter or Super Admin can correct this purchase request.'; end if;
  if request_row.updated_at is distinct from expected_updated_at then
    raise exception 'This request changed after you opened it. Refresh before saving again.';
  end if;
  if request_row.branch_id is null or submitted_branch_id is distinct from request_row.branch_id then
    raise exception 'The purchase request branch cannot be changed while correcting a request.';
  end if;
  if jsonb_typeof(lines_value)<>'object' then raise exception 'Purchase request line payload must be an object.'; end if;
  resolved_lines:=coalesce(lines_value->'resolved','[]'::jsonb);
  unresolved_lines:=coalesce(lines_value->'unresolved','[]'::jsonb);
  if jsonb_typeof(resolved_lines)<>'array' or jsonb_typeof(unresolved_lines)<>'array' then
    raise exception 'Resolved and unresolved purchase request lines must be arrays.';
  end if;
  line_count:=jsonb_array_length(resolved_lines)+jsonb_array_length(unresolved_lines);
  if line_count<1 or line_count>500 then raise exception 'Purchase request must contain between 1 and 500 lines.'; end if;
  if priority_value not in ('low','normal','urgent','critical') then raise exception 'Invalid priority.'; end if;
  if exists (
    select 1 from jsonb_to_recordset(resolved_lines) as line(item_id uuid)
    group by line.item_id having count(*)>1
  ) then raise exception 'Each item can appear only once in a purchase request.'; end if;
  if exists (
    select 1 from jsonb_to_recordset(resolved_lines) as line(branch_id uuid)
    where line.branch_id is distinct from request_row.branch_id
  ) then raise exception 'Mixed-branch purchase request lines are not allowed.'; end if;
  if exists (
    select 1
    from jsonb_to_recordset(resolved_lines) as line(item_id uuid, qty numeric, uom text)
    left join public.items item
      on item.id=line.item_id
      and item.company_id=actor.company_id
      and item.status='active'
      and item.deleted_at is null
    where item.id is null or line.qty is null or line.qty<=0 or nullif(trim(line.uom),'') is null
  ) then
    raise exception 'All selected items must be active, complete, and belong to the request company.';
  end if;
  update public.purchase_requests
  set request_date=request_date_value,
      required_date=required_date_value,
      priority=priority_value,
      needed_by_date=needed_by_date_value,
      urgency_reason=nullif(trim(urgency_reason_value),''),
      production_risk=coalesce(production_risk_value,false),
      remarks=nullif(trim(remarks_value),''),
      updated_by=actor.id
  where id=request_row.id;
  delete from public.purchase_request_lines where purchase_request_id=request_row.id;
  delete from public.purchase_request_unresolved_lines where purchase_request_id=request_row.id;
  insert into public.purchase_request_lines(purchase_request_id,item_id,qty,uom,estimated_unit_cost,suggested_supplier_id,reason,remarks)
  select request_row.id,line.item_id,line.qty,trim(line.uom),line.estimated_unit_cost,line.suggested_supplier_id,nullif(trim(line.reason),''),nullif(trim(line.remarks),'')
  from jsonb_to_recordset(resolved_lines) as line(item_id uuid,qty numeric,uom text,estimated_unit_cost numeric,suggested_supplier_id uuid,reason text,remarks text,branch_id uuid);
  insert into public.purchase_request_unresolved_lines(purchase_request_id,line_no,requested_description,requested_qty,requested_uom,remarks)
  select request_row.id,x.ordinality::integer,trim(x.value->>'requested_description'),(x.value->>'requested_qty')::numeric,trim(x.value->>'requested_uom'),nullif(trim(x.value->>'remarks'),'')
  from jsonb_array_elements(unresolved_lines) with ordinality as x(value,ordinality);
  return jsonb_build_object('id',request_row.id,'request_no',request_row.request_no,'line_count',line_count);
end $$;

revoke all on function public.update_draft_purchase_request(uuid,timestamptz,uuid,date,date,text,date,text,boolean,text,jsonb) from public, anon;
grant execute on function public.update_draft_purchase_request(uuid,timestamptz,uuid,date,date,text,date,text,boolean,text,jsonb) to authenticated;
