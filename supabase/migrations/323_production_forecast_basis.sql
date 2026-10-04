-- Unknown shelf-life must never silently opt in to a same-day demand proxy.
alter table public.production_batch_rules add column forecast_basis text not null default 'manual' check(forecast_basis in ('same_day','manual'));

create or replace function public.configure_production_planning(p_payload jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare a public.staffs%rowtype; k uuid:=(p_payload->>'kitchen_id')::uuid; x jsonb; begin
 a:=public.planning_require_manager('production_planning.manage'); perform public.planning_validate_kitchen(a.company_id,k);
 insert into public.production_planning_settings(company_id,kitchen_id,enabled,draft_time,buffer_percent,max_decrease_percent,recipients,updated_by)
 values(a.company_id,k,coalesce((p_payload->>'enabled')::boolean,false),(p_payload->>'draft_time')::time,(p_payload->>'buffer_percent')::numeric,(p_payload->>'max_decrease_percent')::numeric,
 array(select jsonb_array_elements_text(p_payload->'recipients')),a.id)
 on conflict(kitchen_id) do update set enabled=excluded.enabled,draft_time=excluded.draft_time,buffer_percent=excluded.buffer_percent,max_decrease_percent=excluded.max_decrease_percent,recipients=excluded.recipients,updated_by=a.id,updated_at=now();
 if exists(select 1 from unnest(array(select jsonb_array_elements_text(p_payload->'recipients'))) email where email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$') then raise exception 'Invalid email recipient.'; end if;
 for x in select value from jsonb_array_elements(p_payload->'batches') loop
  if not exists(select 1 from public.products where id=(x->>'product_id')::uuid and company_id=a.company_id and deleted_at is null and lower(category)<>'packaging') then raise exception 'Invalid food product.'; end if;
  insert into public.production_batch_rules(company_id,kitchen_id,product_id,yield_per_tray,forecast_basis,updated_by) values(a.company_id,k,(x->>'product_id')::uuid,(x->>'yield_per_tray')::numeric,coalesce(x->>'forecast_basis','manual'),a.id)
  on conflict(kitchen_id,product_id) do update set yield_per_tray=excluded.yield_per_tray,forecast_basis=excluded.forecast_basis,updated_by=a.id,updated_at=now();
 end loop;
 for x in select value from jsonb_array_elements(p_payload->'minimums') loop
  perform public.planning_validate_route(a.company_id,k,(x->>'branch_id')::uuid,(now() at time zone 'Asia/Kuala_Lumpur')::date);
  if not exists(select 1 from public.products where id=(x->>'product_id')::uuid and company_id=a.company_id and deleted_at is null and lower(category)<>'packaging') then raise exception 'Invalid food product.'; end if;
  insert into public.production_outlet_minimums(company_id,kitchen_id,branch_id,product_id,minimum_qty,confirmed_by)
  values(a.company_id,k,(x->>'branch_id')::uuid,(x->>'product_id')::uuid,(x->>'minimum_qty')::numeric,a.id)
  on conflict(kitchen_id,branch_id,product_id) do update set minimum_qty=excluded.minimum_qty,confirmed_by=a.id,confirmed_at=now();
 end loop;
 insert into public.production_planning_audit(company_id,operation,actor_id,payload) values(a.company_id,'configure',a.id,p_payload);
end $$;

notify pgrst, 'reload schema';
