-- Local candidate. Install separately before the app; no existing RPC is replaced.
-- Quantities are intentionally NULL: this repairs membership, not historical demand.
create function public.append_missing_production_plan_products(p_plan_id uuid,p_revision integer,p_key uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 a public.staffs%rowtype; p public.production_plans%rowtype;
 prior public.production_planning_requests%rowtype;
 request jsonb := jsonb_build_object('plan',p_plan_id,'revision',p_revision);
 added_ids uuid[]; added_allocations integer; result jsonb; live_events jsonb;
begin
 a := public.planning_require_manager('production_planning.manage');
 if p_key is null or p_revision is null or p_revision<1 then raise exception 'Request key and plan revision required.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(a.company_id::text||p_key::text,1));
 select * into prior from public.production_planning_requests where company_id=a.company_id and request_key=p_key;
 if prior.request_key is not null then
  if prior.operation<>'append_missing_products' or prior.request_payload is distinct from request then
   raise exception 'Idempotency key already used for different input.';
  end if;
  return prior.result;
 end if;
 select * into p from public.production_plans where id=p_plan_id and company_id=a.company_id for update;
 if p.id is null or p.revision<>p_revision then raise exception 'Plan changed. Reload before adding products.'; end if;
 if p.status<>'draft' then raise exception 'Only draft plans can add missing products.'; end if;
 perform public.planning_validate_kitchen(a.company_id,p.kitchen_id);
 if not public.planning_branch_access(a.company_id,p.kitchen_id) then raise exception 'Kitchen access required.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p.kitchen_id::text||p.delivery_date::text,0));
 perform pg_advisory_xact_lock(hashtextextended('planning_menu:'||p.kitchen_id::text,0));
 select coalesce(jsonb_agg(to_jsonb(e) order by e.id),'[]'::jsonb) into live_events
 from public.production_planning_events e
 where e.company_id=p.company_id and e.kitchen_id=p.kitchen_id and e.event_date=p.delivery_date and e.confirmed;
 if live_events is distinct from (select coalesce(jsonb_agg(value order by value->>'id'),'[]'::jsonb) from jsonb_array_elements(p.events)) then
  raise exception 'Confirmed events changed. Review them before adding missing products.';
 end if;
 if exists(select 1 from public.production_plan_allocations l where l.plan_id=p.id
   and not exists(select 1 from public.production_plan_products x where x.plan_id=p.id and x.product_id=l.product_id)) then
  raise exception 'Plan has unmatched allocations. Review before adding products.';
 end if;
 -- One statement snapshots all eligibility/configuration inputs and inserts new keys only.
 with eligible as materialized (
  select product.id, batch.yield_per_tray
  from public.products product
  left join public.production_planning_settings settings on settings.company_id=p.company_id and settings.kitchen_id=p.kitchen_id
  left join public.production_batch_rules batch on batch.company_id=p.company_id and batch.kitchen_id=p.kitchen_id and batch.product_id=product.id
  where product.company_id=p.company_id and product.status='active' and product.deleted_at is null
   and lower(trim(product.category))<>'packaging'
   and (product.available_from is null or product.available_from<=p.delivery_date)
   and (product.available_until is null or product.available_until>=p.delivery_date)
   and (settings.included_product_ids is null or product.id=any(settings.included_product_ids))
   and not exists(select 1 from public.production_plan_products old where old.plan_id=p.id and old.product_id=product.id)
 ), destinations as materialized (
  select distinct b.id from public.branches b join public.branch_supply_routes r on r.destination_branch_id=b.id
  where b.company_id=p.company_id and b.status='active' and b.deleted_at is null and b.branch_type='outlet'
   and r.company_id=p.company_id and r.source_branch_id=p.kitchen_id and r.status='active' and r.is_primary
   and r.effective_from<=p.delivery_date and (r.effective_to is null or r.effective_to>=p.delivery_date)
 ), event_lines as materialized (
  select (e->>'branch_id')::uuid branch_id,(line->>'product_id')::uuid product_id,(line->>'qty')::numeric qty
  from jsonb_array_elements(p.events) e cross join lateral jsonb_array_elements(e->'lines') line
 ), inserted as (
  insert into public.production_plan_products(plan_id,product_id,yield_per_tray,trays,retained_qty,event_qty,tray_mode)
  select p.id,e.id,e.yield_per_tray,null,0,
   coalesce((select sum(qty) from event_lines where product_id=e.id and branch_id is null),0),case when exists(select 1 from destinations) then 'automatic' else 'manual' end
  from eligible e on conflict (plan_id,product_id) do nothing returning product_id
 ), allocations as (
  insert into public.production_plan_allocations(plan_id,product_id,branch_id,suggested_qty,approved_qty,minimum_qty,event_qty,evidence)
  select p.id,i.product_id,d.id,null,null,m.minimum_qty,
   coalesce((select sum(qty) from event_lines where product_id=i.product_id and branch_id=d.id),0),
   jsonb_build_object('version','append-missing-v1','method','manual','suggested',null,'weightedMovement',null,
    'minimum',m.minimum_qty,'reductionFloor',null,'stockoutRisk',false,'excluded',0,'evidence','[]'::jsonb,
    'manualReason','Product added to an existing draft. Enter quantities; existing plan inputs were preserved.')
  from inserted i cross join destinations d
  left join public.production_outlet_minimums m on m.company_id=p.company_id and m.kitchen_id=p.kitchen_id and m.branch_id=d.id and m.product_id=i.product_id
  returning product_id
 )
 select coalesce((select array_agg(product_id order by product_id) from inserted),'{}'::uuid[]),
   (select count(*)::integer from allocations) into added_ids,added_allocations;
 if cardinality(added_ids)>0 then
  update public.production_plans set revision=revision+1 where id=p.id;
 end if;
 result:=jsonb_build_object('id',p.id,'added_products',cardinality(added_ids),'added_allocations',added_allocations,
  'revision',p.revision+case when cardinality(added_ids)>0 then 1 else 0 end);
 insert into public.production_planning_requests(company_id,request_key,operation,request_payload,result)
 values(a.company_id,p_key,'append_missing_products',request,result);
 insert into public.production_planning_audit(company_id,plan_id,operation,actor_id,payload)
 values(a.company_id,p.id,'append_missing_products',a.id,jsonb_build_object('request',request,'result',result,'product_ids',added_ids));
 return result;
end $$;
revoke all on function public.append_missing_production_plan_products(uuid,integer,uuid) from public,anon;
grant execute on function public.append_missing_production_plan_products(uuid,integer,uuid) to authenticated;
