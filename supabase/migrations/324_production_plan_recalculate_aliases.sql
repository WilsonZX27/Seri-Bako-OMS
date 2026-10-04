-- Recalculation must not collide with PL/pgSQL allocation/product/payload variables.
create or replace function public.update_production_plan(p_plan_id uuid,p_revision integer,p_action text,p_payload jsonb,p_key uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare a public.staffs%rowtype; p public.production_plans%rowtype; prior public.production_planning_requests%rowtype;
 x jsonb; al public.production_plan_allocations%rowtype; pr public.production_plan_products%rowtype; qty numeric; total numeric; result jsonb; new_id uuid;
begin
 a:=public.planning_require_manager(case when p_action='approve' then 'production_planning.approve' else 'production_planning.manage' end);
 if p_key is null then raise exception 'Idempotency key required.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(a.company_id::text||p_key::text,1));
 select * into prior from public.production_planning_requests where company_id=a.company_id and request_key=p_key;
 if prior.request_key is not null then
  if prior.operation<>p_action or prior.request_payload<>jsonb_build_object('plan',p_plan_id,'revision',p_revision,'payload',p_payload) then raise exception 'Idempotency key already used for different input.'; end if;
  return prior.result;
 end if;
 select * into p from public.production_plans where id=p_plan_id and company_id=a.company_id for update;
 if p.id is null or p.revision<>p_revision then raise exception 'Plan changed. Reload before saving.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p.kitchen_id::text||p.delivery_date::text,0));
 if p_action='revise' then
  if p.status<>'approved' then raise exception 'Only approved plans need a new version.'; end if;
  if exists(select 1 from public.production_plans where kitchen_id=p.kitchen_id and delivery_date=p.delivery_date and status in ('draft','submitted')) then raise exception 'A working revision already exists.'; end if;
  insert into public.production_plans(company_id,kitchen_id,delivery_date,version,buffer_percent,max_decrease_percent,forecast_version,events,holidays,created_by)
  values(p.company_id,p.kitchen_id,p.delivery_date,(select max(version)+1 from public.production_plans where kitchen_id=p.kitchen_id and delivery_date=p.delivery_date),p.buffer_percent,p.max_decrease_percent,p.forecast_version,p.events,p.holidays,a.id) returning id into new_id;
  insert into public.production_plan_products select new_id,product_id,yield_per_tray,trays,retained_qty,null,reason,event_qty,production_job_id from public.production_plan_products where plan_id=p.id;
  insert into public.production_plan_allocations select new_id,product_id,branch_id,suggested_qty,approved_qty,minimum_qty,event_qty,reason,evidence from public.production_plan_allocations where plan_id=p.id;
 elsif p_action in ('save','recalculate') then
  if p.status<>'draft' then raise exception 'Only draft plans can be edited.'; end if;
  if p_action='recalculate' then
   for x in select value from jsonb_array_elements(p_payload->'product_lines') loop
    if not exists(select 1 from public.products where id=(x->>'product_id')::uuid and company_id=p.company_id and status='active' and deleted_at is null and lower(category)<>'packaging') then raise exception 'Invalid food product.'; end if;
    insert into public.production_plan_products(plan_id,product_id,yield_per_tray,trays,event_qty)
    values(p.id,(x->>'product_id')::uuid,(x->>'yield_per_tray')::numeric,(x->>'trays')::integer,(x->>'event_qty')::numeric) on conflict do nothing;
   end loop;
   delete from public.production_plan_allocations allocation_row where allocation_row.plan_id=p.id and not exists(select 1 from jsonb_array_elements(p_payload->'allocations') as payload_element(value) where (payload_element.value->>'branch_id')::uuid=allocation_row.branch_id and (payload_element.value->>'product_id')::uuid=allocation_row.product_id);
   delete from public.production_plan_products product_row where product_row.plan_id=p.id and not exists(select 1 from jsonb_array_elements(p_payload->'product_lines') as payload_element(value) where (payload_element.value->>'product_id')::uuid=product_row.product_id);
   update public.production_plans set buffer_percent=(p_payload->>'buffer_percent')::numeric,max_decrease_percent=(p_payload->>'max_decrease_percent')::numeric where id=p.id;
  end if;
  for x in select value from jsonb_array_elements(p_payload->'allocations') loop
   select * into al from public.production_plan_allocations where plan_id=p.id and product_id=(x->>'product_id')::uuid and branch_id=(x->>'branch_id')::uuid for update;
   if al.plan_id is null and p_action='recalculate' then
    perform public.planning_validate_route(p.company_id,p.kitchen_id,(x->>'branch_id')::uuid,p.delivery_date);
    if not exists(select 1 from public.production_plan_products where plan_id=p.id and product_id=(x->>'product_id')::uuid) then raise exception 'Invalid plan product.'; end if;
    insert into public.production_plan_allocations(plan_id,product_id,branch_id,suggested_qty,approved_qty,minimum_qty,event_qty,evidence)
    values(p.id,(x->>'product_id')::uuid,(x->>'branch_id')::uuid,(x->>'suggested_qty')::numeric,(x->>'approved_qty')::numeric,(x->>'minimum_qty')::numeric,(x->>'event_qty')::numeric,x->'evidence') returning * into al;
   elsif al.plan_id is null then raise exception 'Invalid plan allocation.'; end if;
   perform public.planning_validate_route(p.company_id,p.kitchen_id,al.branch_id,p.delivery_date);
   if p_action='recalculate' then
    update public.production_plan_allocations set suggested_qty=(x->>'suggested_qty')::numeric,evidence=x->'evidence',
    approved_qty=case when reason='' then (x->>'approved_qty')::numeric else approved_qty end,
    minimum_qty=(x->>'minimum_qty')::numeric,event_qty=(x->>'event_qty')::numeric where plan_id=p.id and product_id=al.product_id and branch_id=al.branch_id;
   else
    qty:=(x->>'approved_qty')::numeric;
    if qty is null or qty<0 then raise exception 'Every allocation needs a non-negative quantity.'; end if;
    if qty is distinct from al.suggested_qty and length(trim(coalesce(x->>'reason','')))=0 then raise exception 'Give a reason for changing the system suggestion.'; end if;
    update public.production_plan_allocations set approved_qty=qty,reason=coalesce(x->>'reason','') where plan_id=p.id and product_id=al.product_id and branch_id=al.branch_id;
   end if;
  end loop;
  for x in select value from jsonb_array_elements(p_payload->'product_lines') loop
   if p_action='recalculate' then
    update public.production_plan_products set trays=case when reason='' then (x->>'trays')::integer else trays end,yield_per_tray=(x->>'yield_per_tray')::numeric,event_qty=(x->>'event_qty')::numeric where plan_id=p.id and product_id=(x->>'product_id')::uuid;
   else
    if (x->>'trays')::numeric<>trunc((x->>'trays')::numeric) then raise exception 'Trays must be whole numbers.'; end if;
    update public.production_plan_products set trays=(x->>'trays')::integer,retained_qty=(x->>'retained_qty')::numeric,reason=coalesce(x->>'reason','') where plan_id=p.id and product_id=(x->>'product_id')::uuid;
   end if;
  end loop;
  if p_action='recalculate' then update public.production_plans set events=p_payload->'events',holidays=p_payload->'holidays' where id=p.id; end if;
 elsif p_action in ('submit','approve') then
  if (p_action='submit' and p.status<>'draft') or (p_action='approve' and p.status<>'submitted') then raise exception 'Invalid approval state.'; end if;
  if p.events is distinct from coalesce((select jsonb_agg(to_jsonb(e) order by e.id) from public.production_planning_events e where e.company_id=p.company_id and e.kitchen_id=p.kitchen_id and e.event_date=p.delivery_date and e.confirmed),'[]'::jsonb) then raise exception 'Confirmed events changed. Recalculate before review.'; end if;
  if not exists(select 1 from public.production_plan_products where plan_id=p.id) then raise exception 'No products in plan.'; end if;
  for al in select * from public.production_plan_allocations where plan_id=p.id loop
   perform public.planning_validate_route(p.company_id,p.kitchen_id,al.branch_id,p.delivery_date);
   if al.approved_qty<al.event_qty then raise exception 'Allocation cannot be less than the confirmed event quantity.'; end if;
   if not exists(select 1 from public.production_outlet_minimums m where m.kitchen_id=p.kitchen_id and m.branch_id=al.branch_id and m.product_id=al.product_id and m.minimum_qty=al.minimum_qty) then raise exception 'Outlet minimum changed or is unconfirmed. Recalculate the draft.'; end if;
   if al.approved_qty is null or al.minimum_qty is null then raise exception 'Complete manual quantities and confirm outlet minimums first.'; end if;
   if (al.approved_qty<al.minimum_qty+al.event_qty or al.approved_qty<coalesce((al.evidence->>'reductionFloor')::numeric,0)+al.event_qty) and length(trim(al.reason))=0 then raise exception 'Below the minimum or gradual-reduction limit. A Manager reason is required.'; end if;
  end loop;
  for pr in select * from public.production_plan_products where plan_id=p.id loop
   if not exists(select 1 from public.production_batch_rules b where b.kitchen_id=p.kitchen_id and b.product_id=pr.product_id and b.yield_per_tray=pr.yield_per_tray) then raise exception 'Batch yield changed or is unconfigured. Recalculate the draft.'; end if;
   select coalesce(sum(approved_qty),0)+pr.event_qty into total from public.production_plan_allocations where plan_id=p.id and product_id=pr.product_id;
   if pr.yield_per_tray is null or pr.trays is null or pr.trays*pr.yield_per_tray<>total+pr.retained_qty then raise exception 'Allocate all whole-tray output or explicitly retain the remainder in the kitchen.'; end if;
   if pr.retained_qty>0 and length(trim(pr.reason))=0 then raise exception 'A reason is required for kitchen retention.'; end if;
  end loop;
  if p_action='approve' then
   if not exists(select 1 from public.production_planning_settings where kitchen_id=p.kitchen_id and cardinality(recipients)>0) then raise exception 'Configure kitchen email recipients before release.'; end if;
   update public.production_plans set status='superseded' where kitchen_id=p.kitchen_id and delivery_date=p.delivery_date and status='approved';
   update public.production_plans set status='approved',approved_by=a.id,approved_at=now() where id=p.id;
   perform public.planning_queue_release(p.id);
  else update public.production_plans set status='submitted' where id=p.id; end if;
 elsif p_action='return' then
  if p.status<>'submitted' or length(trim(coalesce(p_payload->>'reason','')))=0 then raise exception 'Submitted plan and return reason required.'; end if;
  update public.production_plans set status='draft' where id=p.id;
 else raise exception 'Invalid plan action.';
 end if;
 update public.production_plans set revision=revision+1 where id=p.id;
 result:=jsonb_build_object('id',coalesce(new_id,p.id));
 insert into public.production_planning_requests values(a.company_id,p_key,p_action,jsonb_build_object('plan',p_plan_id,'revision',p_revision,'payload',p_payload),result,now());
 insert into public.production_planning_audit(company_id,plan_id,operation,actor_id,payload) values(p.company_id,p.id,p_action,a.id,p_payload);
 return result;
end $$;

notify pgrst, 'reload schema';
