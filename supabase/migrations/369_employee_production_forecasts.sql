-- Recurring employee demand is independent from minimums and dated approved plans.
create table public.production_outlet_forecasts (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id),
 kitchen_id uuid not null references public.branches(id),
 branch_id uuid not null references public.branches(id),
 product_id uuid not null references public.products(id),
 weekday_qty numeric check(weekday_qty between 0 and 1000000 and weekday_qty=trunc(weekday_qty)),
 weekend_qty numeric check(weekend_qty between 0 and 1000000 and weekend_qty=trunc(weekend_qty)),
 source text not null default '' check(length(source)<=250),
 updated_by uuid not null references public.staffs(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(kitchen_id,branch_id,product_id)
);
alter table public.production_outlet_forecasts enable row level security;
revoke all on public.production_outlet_forecasts from public, anon, authenticated;
grant select on public.production_outlet_forecasts to authenticated;
grant all on public.production_outlet_forecasts to service_role;
create policy planning_forecast_read on public.production_outlet_forecasts for select to authenticated
 using(public.planning_branch_access(company_id,kitchen_id));

create function public.configure_production_planning_forecasts(p_payload jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare a public.staffs%rowtype; k uuid:=(p_payload->>'kitchen_id')::uuid;
 x jsonb; prior public.production_outlet_forecasts%rowtype; b uuid; p uuid; dt date:=(p_payload->>'as_of')::date;
begin
 a:=public.planning_require_manager('production_planning.manage');
 perform public.planning_validate_kitchen(a.company_id,k);
 perform pg_advisory_xact_lock(hashtextextended('employee_forecast:'||k::text,0));
 if dt is null or jsonb_typeof(p_payload->'forecasts') is distinct from 'array'
   or jsonb_array_length(p_payload->'forecasts')>10000 then raise exception 'A dated forecast list is required.'; end if;
 if exists(select 1 from jsonb_array_elements(p_payload->'forecasts') v group by v->>'branch_id',v->>'product_id' having count(*)>1)
 then raise exception 'Duplicate forecast destination/product.'; end if;
 for x in select value from jsonb_array_elements(p_payload->'forecasts') loop
  b:=(x->>'branch_id')::uuid; p:=(x->>'product_id')::uuid;
  perform public.planning_validate_route(a.company_id,k,b,dt);
  if not exists(select 1 from public.products where id=p and company_id=a.company_id and status='active' and deleted_at is null)
  then raise exception 'Active company product required.'; end if;
  if not(x ? 'weekday_qty' and x ? 'weekend_qty' and x ? 'expected_updated_at')
    or jsonb_typeof(x->'weekday_qty') not in ('number','null') or jsonb_typeof(x->'weekend_qty') not in ('number','null')
  then raise exception 'Explicit weekday and weekend quantities or null required.'; end if;
  select * into prior from public.production_outlet_forecasts where kitchen_id=k and branch_id=b and product_id=p for update;
  if prior.updated_at is distinct from (x->>'expected_updated_at')::timestamptz
  then raise exception 'Employee forecast changed. Reload before saving.'; end if;
  insert into public.production_outlet_forecasts(company_id,kitchen_id,branch_id,product_id,weekday_qty,weekend_qty,source,updated_by)
  values(a.company_id,k,b,p,(x->>'weekday_qty')::numeric,(x->>'weekend_qty')::numeric,coalesce(x->>'source',''),a.id)
  on conflict(kitchen_id,branch_id,product_id) do update set weekday_qty=excluded.weekday_qty,
   weekend_qty=excluded.weekend_qty,source=excluded.source,updated_by=a.id,updated_at=clock_timestamp();
  -- No fixed floor is imposed by an employee forecast. Keep previously confirmed minima.
  if (x->>'weekday_qty') is not null or (x->>'weekend_qty') is not null then
   insert into public.production_outlet_minimums(company_id,kitchen_id,branch_id,product_id,minimum_qty,confirmed_by)
   values(a.company_id,k,b,p,0,a.id) on conflict(kitchen_id,branch_id,product_id) do nothing;
  end if;
 end loop;
 insert into public.production_planning_audit(company_id,operation,actor_id,payload)
 values(a.company_id,'employee_forecasts',a.id,p_payload);
end $$;
revoke all on function public.configure_production_planning_forecasts(jsonb) from public,anon;
grant execute on function public.configure_production_planning_forecasts(jsonb) to authenticated;

-- Settings and forecast edits commit or roll back together; older clients remain supported.
create function public.configure_production_planning_with_forecasts(p_payload jsonb) returns void
language plpgsql security definer set search_path=public as $$
begin
 perform public.configure_production_planning(p_payload);
 perform public.configure_production_planning_forecasts(p_payload);
end $$;
revoke all on function public.configure_production_planning_with_forecasts(jsonb) from public,anon;
grant execute on function public.configure_production_planning_with_forecasts(jsonb) to authenticated;
