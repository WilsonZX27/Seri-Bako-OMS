-- External orders remain branchless and never create self-operated outlet demand.
-- Existing approved plan snapshots and delivery orders are not rewritten.
alter table public.production_planning_events add column demand_kind text;
update public.production_planning_events set demand_kind=case when branch_id is null then 'corporate_event' else 'outlet_event' end;
alter table public.production_planning_events alter column demand_kind set not null;
alter table public.production_planning_events add constraint production_event_demand_kind check(demand_kind in ('outlet_event','corporate_event','franchise_order') and ((demand_kind='outlet_event') = (branch_id is not null)));
create or replace function public.save_production_event(p_payload jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare a public.staffs%rowtype; k uuid:=(p_payload->>'kitchen_id')::uuid; b uuid:=(p_payload->>'branch_id')::uuid; x jsonb; eid uuid; kind text:=coalesce(p_payload->>'demand_kind',case when b is null then 'corporate_event' else 'outlet_event' end); begin
 a:=public.planning_require_manager('production_planning.manage'); perform public.planning_validate_kitchen(a.company_id,k);
 if kind not in ('outlet_event','corporate_event','franchise_order') or (kind='outlet_event') is distinct from (b is not null) then raise exception 'Choose an outlet event or an independent external order.'; end if;
 if b is not null then
  if (public.resolve_production_event_supply((p_payload->>'event_date')::date,b)->>'kitchen_id')::uuid is distinct from k then raise exception 'Event kitchen does not match the effective primary supply route.'; end if;
 end if;
 if jsonb_typeof(p_payload->'lines')<>'array' or jsonb_array_length(p_payload->'lines')=0 then raise exception 'Event products required.'; end if;
 for x in select value from jsonb_array_elements(p_payload->'lines') loop
  if (x->>'qty')::numeric<=0 or not exists(select 1 from public.products where id=(x->>'product_id')::uuid and company_id=a.company_id and deleted_at is null and lower(category)<>'packaging') then raise exception 'Invalid event product or quantity.'; end if;
 end loop;
 insert into public.production_planning_events(company_id,kitchen_id,branch_id,event_date,name,notes,confirmed,lines,created_by,demand_kind)
 values(a.company_id,k,b,(p_payload->>'event_date')::date,p_payload->>'name',coalesce(p_payload->>'notes',''),coalesce((p_payload->>'confirmed')::boolean,false),p_payload->'lines',a.id,kind) returning id into eid;
 return eid;
end $$;


notify pgrst, 'reload schema';
