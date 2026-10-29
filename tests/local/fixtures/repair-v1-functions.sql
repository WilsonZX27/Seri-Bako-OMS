-- Synthetic rollback baseline for the isolated test harness only. Not an installer.
create or replace function public.asset_check_exception_request() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
declare open_request public.asset_maintenance;
begin
 if new.result='Checked' then return new; end if;
 -- Same asset/location lock as manual reporting; never merge or delete history.
 perform pg_advisory_xact_lock(hashtextextended(new.company_id::text||'/open-asset-repair/'||new.asset_id::text||'/'||new.location_id::text,0));
 select * into open_request from public.asset_maintenance
 where company_id=new.company_id and asset_id=new.asset_id and location_id=new.location_id
 and lower(coalesce(status,'')) not in ('closed','resolved','cancelled')
 order by created_at desc,id desc limit 1 for update;
 if found then
  insert into public.asset_maintenance_updates(company_id,maintenance_id,source_id,author_name,source_data)
  values(new.company_id,open_request.id,'CHECK-'||new.id,new.author_name,
   jsonb_build_object('Checklist ID',new.id,'Inspection result',new.result,'Comment',new.source_data->>'remark','Actor ID',public.current_staff_id(),'Status Before',open_request.status,'Status After',open_request.status,'Update Date',(now() at time zone 'Asia/Kuala_Lumpur')::text))
  on conflict(company_id,source_id) do nothing;
 else
  insert into public.asset_maintenance(company_id,asset_id,location_id,source_id,status,priority,description,author_name,source_data,reported_by)
  values(new.company_id,new.asset_id,new.location_id,'CHECK-'||new.id,'Open','Normal',new.result||': '||coalesce(new.source_data->>'remark',''),new.author_name,
   jsonb_build_object('Checklist ID',new.id,'Actor ID',public.current_staff_id(),'Created Date',(now() at time zone 'Asia/Kuala_Lumpur')::text),public.current_staff_id())
  on conflict(company_id,source_id) do nothing;
 end if;
 return new;
end $$;

create or replace function public.report_asset_maintenance(p_asset uuid,p_location uuid,p_description text,p_priority text,p_client_key uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare company uuid:=public.current_staff_company_id(); result uuid; existing public.asset_maintenance;
begin
 if not (public.has_permission('assets.report') or (public.asset_management_role() and public.has_permission('assets.maintenance'))) or not public.asset_location_access(p_location) then raise exception 'Maintenance permission denied'; end if;
 if p_asset is not null and not exists(select 1 from public.asset_holdings where company_id=company and asset_id=p_asset and location_id=p_location and (quantity is null or quantity>0)) then raise exception 'Asset not held at this location'; end if;
 if length(trim(coalesce(p_description,''))) not between 1 and 4000 or p_priority is null or p_priority not in ('Low','Normal','High','Urgent') or p_client_key is null then raise exception 'Invalid maintenance details'; end if;
 perform pg_advisory_xact_lock(hashtextextended(company::text||'/maintenance/'||p_client_key::text,0));
 if p_asset is not null then perform pg_advisory_xact_lock(hashtextextended(company::text||'/open-asset-repair/'||p_asset::text||'/'||p_location::text,0)); end if;
 select * into existing from public.asset_maintenance where company_id=company and source_id='OMS-'||p_client_key;
 if found then
  if existing.reported_by is distinct from public.current_staff_id() or existing.asset_id is distinct from p_asset or existing.location_id<>p_location or existing.description<>trim(p_description) or existing.priority<>p_priority then raise exception 'Maintenance key was reused with different details'; end if;
  return existing.id;
 end if;
 if p_asset is not null and exists(select 1 from public.asset_maintenance where company_id=company and asset_id=p_asset and location_id=p_location and lower(coalesce(status,'')) not in ('closed','resolved','cancelled')) then
  raise exception 'An open repair already exists for this asset at this location. Review that request before reporting again.';
 end if;
 insert into public.asset_maintenance(company_id,asset_id,location_id,source_id,status,priority,description,author_name,source_data,reported_by)
 values(company,p_asset,p_location,'OMS-'||p_client_key,'Open',p_priority,trim(p_description),coalesce((select full_name from public.staffs where id=public.current_staff_id()),'OMS staff'),jsonb_build_object('Actor ID',public.current_staff_id(),'Created Date',(now() at time zone 'Asia/Kuala_Lumpur')::text),public.current_staff_id()) returning id into result;
 return result;
end $$;

create or replace function public.get_asset_check_open_repairs(p_location uuid,p_assets uuid[]) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare company uuid:=public.current_staff_company_id();
begin
 if company is null or not public.has_permission('assets.check') or not public.asset_location_access(p_location) then raise exception 'Checklist permission denied'; end if;
 if p_assets is null or cardinality(p_assets)>5000 or exists(select 1 from unnest(p_assets) a where not exists(select 1 from public.asset_holdings h where h.company_id=company and h.asset_id=a and h.location_id=p_location)) then raise exception 'Checklist assets outside assigned holding'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('asset_id',asset_id,'id',id,'status',status,'description',description,'open_count',open_count)) from (
  select distinct on(asset_id) asset_id,id,status,description,count(*) over(partition by asset_id) open_count
  from public.asset_maintenance where company_id=company and location_id=p_location and asset_id=any(p_assets)
  and lower(coalesce(status,'')) not in ('closed','resolved','cancelled') order by asset_id,created_at desc,id desc
 ) active),'[]'::jsonb);
end $$;