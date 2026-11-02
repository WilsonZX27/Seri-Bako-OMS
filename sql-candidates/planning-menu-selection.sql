-- REVIEW CANDIDATE ONLY. No migration number reserved; do not install with app-only release.
-- Null preserves legacy inclusion. [] explicitly excludes every ordinary product.
alter table public.production_planning_settings add column included_product_ids uuid[];

create function public.configure_production_planning_menu(p_payload jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare a public.staffs%rowtype; k uuid := (p_payload->>'kitchen_id')::uuid;
 selected uuid[]; prior uuid[]; expected uuid[];
begin
 a := public.planning_require_manager('production_planning.manage');
 perform public.planning_validate_kitchen(a.company_id,k);
 perform pg_advisory_xact_lock(hashtextextended('planning_menu:'||k::text,0));
 if jsonb_typeof(p_payload->'included_product_ids') is distinct from 'array'
   or jsonb_array_length(p_payload->'included_product_ids')>500
   or not (p_payload ? 'expected_included_product_ids')
   or jsonb_typeof(p_payload->'expected_included_product_ids') not in ('array','null')
 then raise exception 'Explicit planning product selection and prior selection required.'; end if;
 selected := array(select value::uuid from jsonb_array_elements_text(p_payload->'included_product_ids') order by value::uuid);
 if cardinality(selected) <> (select count(distinct id) from unnest(selected) id)
   or exists(select 1 from unnest(selected) as choice(product_id) where not exists(select 1 from public.products p where p.id=choice.product_id and p.company_id=a.company_id and p.status='active' and p.deleted_at is null and lower(trim(p.category))<>'packaging'))
 then raise exception 'Unique active company food products required.'; end if;
 select included_product_ids into prior from public.production_planning_settings where company_id=a.company_id and kitchen_id=k for update;
 prior := case when prior is null then null else array(select id from unnest(prior) id order by id) end;
 expected := case when p_payload->'expected_included_product_ids'='null'::jsonb then null else array(select value::uuid from jsonb_array_elements_text(p_payload->'expected_included_product_ids') order by value::uuid) end;
 if prior is distinct from expected then raise exception 'Planning product selection changed. Reload before saving.'; end if;
 if p_payload ? 'forecasts' then perform public.configure_production_planning_with_forecasts(p_payload);
 else perform public.configure_production_planning(p_payload); end if;
 update public.production_planning_settings set included_product_ids=selected where company_id=a.company_id and kitchen_id=k;
 insert into public.production_planning_audit(company_id,operation,actor_id,payload) values(a.company_id,'planning_menu',a.id,jsonb_build_object('kitchen_id',k,'included_product_ids',selected));
end $$;
revoke all on function public.configure_production_planning_menu(jsonb) from public,anon;
grant execute on function public.configure_production_planning_menu(jsonb) to authenticated;
