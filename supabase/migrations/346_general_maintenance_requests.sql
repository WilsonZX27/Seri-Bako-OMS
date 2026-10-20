-- Extend the existing maintenance queue to general site problems; no parallel ledger.
-- Staff reporting is distinct from maintenance management and remains location scoped.
begin;
insert into public.permissions(permission_code,module,action,description) values
 ('assets.report','assets','report','Report site problems and follow own requests') on conflict do nothing;
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p
where p.permission_code='assets.report' and r.role_code in ('super_admin','manager','outlet_supervisor','outlet_staff','kitchen') on conflict do nothing;
alter table public.asset_maintenance alter column asset_id drop not null;
alter table public.asset_maintenance add column reported_by uuid references public.staffs(id);
create index asset_maintenance_reporter_idx on public.asset_maintenance(company_id,reported_by,created_at desc);
alter table public.asset_attachments alter column asset_id drop not null;
alter table public.asset_attachments add constraint asset_attachment_has_parent check(asset_id is not null or maintenance_id is not null);
alter policy asset_maintenance_read on public.asset_maintenance using (
 company_id=(select public.current_staff_company_id()) and public.asset_location_access(location_id)
 and ((select public.asset_management_role()) or (reported_by=(select public.current_staff_id()) and (select public.has_permission('assets.report'))))
);
alter policy asset_attachments_read on public.asset_attachments using (
 company_id=(select public.current_staff_company_id())
 and ((maintenance_id is not null and exists(select 1 from public.asset_maintenance m where m.id=maintenance_id)
       and public.asset_location_access(location_id))
 or (maintenance_id is null and exists(select 1 from public.assets a where a.id=asset_id)
       and (location_id is not null and public.asset_location_access(location_id)
         or location_id is null and public.asset_original_record_access(asset_id))))
);
create or replace function public.asset_attachment_parent_guard() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$ begin
 if new.maintenance_id is not null and not exists(select 1 from public.asset_maintenance m where m.company_id=new.company_id and m.id=new.maintenance_id and m.asset_id is not distinct from new.asset_id and m.location_id=new.location_id) then raise exception 'Attachment maintenance, asset or location mismatch'; end if;
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
 select * into existing from public.asset_maintenance where company_id=company and source_id='OMS-'||p_client_key;
 if found then
  if existing.reported_by is distinct from public.current_staff_id() or existing.asset_id is distinct from p_asset or existing.location_id<>p_location or existing.description<>trim(p_description) or existing.priority<>p_priority then raise exception 'Maintenance key was reused with different details'; end if;
  return existing.id;
 end if;
 insert into public.asset_maintenance(company_id,asset_id,location_id,source_id,status,priority,description,author_name,source_data,reported_by)
 values(company,p_asset,p_location,'OMS-'||p_client_key,'Open',p_priority,trim(p_description),coalesce((select full_name from public.staffs where id=public.current_staff_id()),'OMS staff'),jsonb_build_object('Actor ID',public.current_staff_id(),'Created Date',(now() at time zone 'Asia/Kuala_Lumpur')::text),public.current_staff_id()) returning id into result;
 return result;
end $$;

create or replace function public.reserve_asset_attachment(p_asset uuid,p_key uuid,p_label text,p_kind text,p_type text,p_size integer,p_sha256 text,p_maintenance uuid default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare company uuid:=public.current_staff_company_id(); actor uuid:=public.current_staff_id(); row public.asset_attachments; extension text; parent_location uuid;
begin
 if not public.asset_company_live(company) or not (public.has_permission('assets.manage') or (p_maintenance is not null and p_kind='Photo' and p_type in ('image/jpeg','image/png','image/webp') and (public.has_permission('assets.maintenance') or public.has_permission('assets.report')))) then raise exception 'Asset attachment permission denied'; end if;
 if p_maintenance is not null then
  select m.location_id into parent_location from public.asset_maintenance m where m.company_id=company and m.id=p_maintenance and m.asset_id is not distinct from p_asset and public.asset_location_access(m.location_id) and (public.asset_management_role() or m.reported_by=actor);
  if not found then raise exception 'Asset attachment permission denied'; end if;
 elsif not exists(select 1 from public.asset_holdings h where h.company_id=company and h.asset_id=p_asset and public.asset_location_access(h.location_id)) then raise exception 'Asset attachment permission denied'; end if;
 if p_key is null or length(trim(coalesce(p_label,''))) not between 1 and 180 or coalesce(p_kind,'') not in ('Photo','Invoice','Warranty','Other') or coalesce(p_type,'') not in ('image/jpeg','image/png','image/webp','application/pdf') or p_size is null or p_size not between 1 and 10485760 or coalesce(p_sha256,'')!~'^[0-9a-f]{64}$' then raise exception 'Invalid asset attachment'; end if;
 perform pg_advisory_xact_lock(hashtextextended(company::text||'/attachment/'||p_key::text,0));
 select * into row from public.asset_attachments where company_id=company and source_key='oms:'||p_key::text;
 if found then
  if row.asset_id is distinct from p_asset or row.maintenance_id is distinct from p_maintenance or row.source_data->>'Actor ID' is distinct from actor::text or row.source_data->>'File Name' is distinct from trim(p_label) or row.source_data->>'Kind' is distinct from p_kind or row.source_data->>'File Type' is distinct from p_type or row.source_data->>'File Size' is distinct from p_size::text or row.source_data->>'Expected SHA256' is distinct from p_sha256 then raise exception 'Attachment key already used with different content'; end if;
 else
  extension:=case p_type when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp' else 'pdf' end;
  row.id:=gen_random_uuid();
  insert into public.asset_attachments(id,company_id,asset_id,maintenance_id,location_id,source_key,source_data,url,storage_path)
  values(row.id,company,p_asset,p_maintenance,parent_location,'oms:'||p_key::text,jsonb_build_object('File Name',trim(p_label),'Kind',p_kind,'File Type',p_type,'File Size',p_size,'Expected SHA256',p_sha256,'Actor ID',actor,'Uploaded By',coalesce((select full_name from public.staffs where id=actor),'OMS staff'),'Origin','OMS upload'),'',''||company::text||'/'||coalesce(p_asset::text,'maintenance/'||p_maintenance::text)||'/'||row.id::text||'.'||extension) returning * into row;
 end if;
 return jsonb_build_object('id',row.id,'storage_path',row.storage_path,'verified',row.verified_at is not null);
end $$;
notify pgrst,'reload schema';
commit;
