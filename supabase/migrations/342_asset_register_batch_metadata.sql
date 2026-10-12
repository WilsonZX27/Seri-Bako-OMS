-- Batch only the source fields already disclosed by get_asset_identity.
-- Caller scope and original-outlet provenance remain independent checks.
create or replace function public.get_asset_register_source_fields(p_assets uuid[])
returns table(asset_id uuid,details jsonb) language sql stable security definer
set search_path=pg_catalog,public as $$
 with actor as materialized (
  select public.current_staff_company_id() company,public.has_permission('assets.view') allowed,
   public.current_staff_has_company_role(array['super_admin']) owner
 ), locations as materialized (
  select l.id,l.source_name from public.asset_locations l cross join actor c
  where l.company_id=c.company and c.allowed and public.asset_location_access(l.id)
 )
 select a.id,case when c.owner or exists(select 1 from locations l where l.source_name=a.source_data->>'Location')
 then jsonb_build_object('Department / Area',a.source_data->>'Department / Area','Category',a.source_data->>'Category','Subcategory',a.source_data->>'Subcategory')
 else '{}'::jsonb end
 from public.assets a cross join actor c
 where a.company_id=c.company and c.allowed and public.asset_company_live(c.company)
 and a.id=any(p_assets)
 and (c.owner or exists(select 1 from public.asset_holdings h join locations l on l.id=h.location_id where h.asset_id=a.id and h.company_id=c.company)
 or exists(select 1 from public.asset_transfers t where t.asset_id=a.id and t.company_id=c.company and (t.from_location_id in(select id from locations) or t.to_location_id in(select id from locations))));
$$;
revoke all on function public.get_asset_register_source_fields(uuid[]) from public,anon;
grant execute on function public.get_asset_register_source_fields(uuid[]) to authenticated;

-- SECURITY INVOKER and get_asset_identity preserve assigned scope and original-record provenance.
create or replace function public.get_asset_register(p_page integer default 1,p_query text default '',p_location uuid default null,p_sort text default 'code',p_status text default '',p_category text default '') returns jsonb language sql stable set search_path=public as $$
 with visible as materialized (
  select a.id,a.asset_code,a.item_name,a.current_details from public.assets a where a.company_id=(select public.current_staff_company_id())
 ), source_fields as materialized (
  select * from public.get_asset_register_source_fields((select coalesce(array_agg(id),'{}'::uuid[]) from visible))
 ), catalog as materialized (
  select a.id,a.asset_code,a.item_name,jsonb_build_object(
   'Department / Area',coalesce(a.current_details->>'Department / Area',i.details->>'Department / Area'),
   'Category',coalesce(a.current_details->>'Category',i.details->>'Category'),
   'Subcategory',coalesce(a.current_details->>'Subcategory',i.details->>'Subcategory')
  ) current_details
  from visible a left join source_fields i on i.asset_id=a.id
 ), filtered as materialized (
  select a.* from catalog a where (nullif(trim(p_query),'') is null or (case when upper(trim(p_query)) like 'SB-%' then a.asset_code else a.item_name end) ilike '%'||replace(replace(trim(p_query),'%','\%'),'_','\_')||'%')
  and (nullif(p_category,'') is null or a.current_details->>'Category'=p_category)
  and ((p_location is null and nullif(p_status,'') is null) or exists(select 1 from public.asset_holdings h where h.asset_id=a.id and (p_location is null or h.location_id=p_location) and (nullif(p_status,'') is null or h.status=p_status)))
 ), paged as materialized (
  select * from filtered order by case when p_sort='name' then item_name else asset_code end,id limit 50 offset (greatest(p_page,1)-1)*50
 )
 select jsonb_build_object('total',(select count(*) from filtered),'assets',coalesce((select jsonb_agg(to_jsonb(a) order by case when p_sort='name' then item_name else asset_code end,id) from paged a),'[]'::jsonb),
 'holdings',coalesce((select jsonb_agg(jsonb_build_object('asset_id',h.asset_id,'location_id',h.location_id,'quantity',h.quantity,'condition',h.condition,'status',h.status,'latest_check_result',h.latest_check_result)) from public.asset_holdings h join paged a on a.id=h.asset_id where p_location is null or h.location_id=p_location),'[]'::jsonb),
 'filterOptions',jsonb_build_object('categories',coalesce((select jsonb_agg(value order by value) from (select distinct current_details->>'Category' value from catalog where nullif(current_details->>'Category','') is not null) q),'[]'::jsonb),'statuses',coalesce((select jsonb_agg(value order by value) from (select distinct status value from public.asset_holdings where nullif(status,'') is not null) q),'[]'::jsonb)));
$$;
revoke all on function public.get_asset_register(integer,text,uuid,text,text,text) from public,anon;
grant execute on function public.get_asset_register(integer,text,uuid,text,text,text) to authenticated;
notify pgrst,'reload schema';
