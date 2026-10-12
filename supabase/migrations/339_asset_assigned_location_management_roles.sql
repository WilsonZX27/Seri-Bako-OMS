-- Asset-only role and assigned-location restriction. Preserve source records.
-- Apply independently after 337/338; no unrelated permission migration is included.
create or replace function public.asset_management_role() returns boolean
language sql stable security definer set search_path=pg_catalog,public as $$
 select public.current_staff_has_company_role(array['super_admin','manager','outlet_supervisor'])
$$;
revoke all on function public.asset_management_role() from public,anon;
grant execute on function public.asset_management_role() to authenticated;

create or replace function public.asset_location_access(p_location uuid) returns boolean
language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select 1 from public.asset_locations l
 where l.id=p_location and l.company_id=public.current_staff_company_id()
 and public.asset_company_live(l.company_id) and public.has_permission('assets.view')
 and (public.current_staff_has_company_role(array['super_admin']) or
 (l.kind='branch' and exists(select 1 from public.staffs s
 where s.id=public.current_staff_id() and s.company_id=l.company_id
 and (s.default_branch_id=l.branch_id or exists(select 1 from public.staff_branches sb where sb.staff_id=s.id and sb.branch_id=l.branch_id))))))
$$;

-- Old broad grants may not override the explicit assigned-location policy.
delete from public.role_permissions rp using public.roles r, public.permissions p
 where rp.role_id=r.id and rp.permission_id=p.id and p.permission_code='assets.view_all' and r.role_code<>'super_admin';
delete from public.role_permissions rp using public.roles r, public.permissions p
 where rp.role_id=r.id and rp.permission_id=p.id and p.permission_code='assets.maintenance'
 and r.role_code not in ('super_admin','manager','outlet_supervisor');

alter policy assets_read on public.assets using (
 company_id=(select public.current_staff_company_id())
 and (select public.asset_company_live(public.current_staff_company_id()))
 and (select public.has_permission('assets.view'))
 and ((select public.current_staff_has_company_role(array['super_admin']))
 or id in (select asset_id from public.asset_holdings)
 or id in (select asset_id from public.asset_transfers))
);
alter policy asset_maintenance_read on public.asset_maintenance using (
 company_id=(select public.current_staff_company_id())
 and (select public.asset_management_role())
 and location_id in (select id from public.asset_locations)
);

create or replace function public.get_asset_overview(p_date date default (now() at time zone 'Asia/Kuala_Lumpur')::date) returns jsonb
language plpgsql stable security invoker set search_path=pg_catalog,public as $$
begin
 if not public.asset_management_role() then raise exception 'Asset management role required'; end if;
 return (
 select jsonb_build_object(
 'assetCount',(select count(*) from public.assets),
 'knownQuantity',(select coalesce(sum(quantity),0) from public.asset_holdings),
 'unknownHoldings',(select count(*) from public.asset_holdings where quantity is null),
 'attentionAssets',(select count(distinct asset_id) from public.asset_holdings where condition in ('Damaged','Review Required','Needs Maintenance','Missing')),
 'openMaintenance',(select count(*) from public.asset_maintenance where lower(status) not in ('closed','resolved','cancelled')),
 'inTransitQuantity',(select coalesce(sum(quantity),0) from public.asset_transfers where status='dispatched'),
 'checkDate',p_date,
 'checklist',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'name',l.source_name,'kind',l.kind,
  'open',coalesce((select d.is_open from public.asset_calendar_days d where d.location_id=l.id and d.business_date=p_date),l.kind='branch'),
  'reason',(select d.reason from public.asset_calendar_days d where d.location_id=l.id and d.business_date=p_date),
  'expected',(select count(*) from public.asset_holdings h where h.location_id=l.id and (h.quantity is null or h.quantity>0)),
  'checked',(select count(*) from public.asset_holdings h where h.location_id=l.id and (h.quantity is null or h.quantity>0) and exists(select 1 from public.asset_daily_checks c where c.location_id=l.id and c.asset_id=h.asset_id and c.check_date=p_date)))) from public.asset_locations l),'[]'::jsonb),
 'locations',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'name',l.source_name,'assetCount',(select count(*) from public.asset_holdings h where h.location_id=l.id),'quantity',(select sum(quantity) from public.asset_holdings h where h.location_id=l.id))) from public.asset_locations l),'[]'::jsonb),
 'maintenanceTrend',coalesce((select jsonb_agg(jsonb_build_object('date',day::date,'count',(select count(*) from public.asset_maintenance m where left(m.source_data->>'Created Date',10)=day::date::text)) order by day) from generate_series((now() at time zone 'Asia/Kuala_Lumpur')::date-13,(now() at time zone 'Asia/Kuala_Lumpur')::date,interval '1 day') day),'[]'::jsonb),
 'issueTrend',coalesce((select jsonb_agg(jsonb_build_object('date',day::date,'checked',(select count(*) from public.asset_daily_checks c where c.check_date=day::date),'count',(select case when count(*)=0 then null else count(*) filter(where c.result<>'Checked') end from public.asset_daily_checks c where c.check_date=day::date)) order by day) from generate_series((now() at time zone 'Asia/Kuala_Lumpur')::date-13,(now() at time zone 'Asia/Kuala_Lumpur')::date,interval '1 day') day),'[]'::jsonb),
 'maintenanceByStatus',coalesce((select jsonb_agg(jsonb_build_object('status',status,'count',n)) from (select status,count(*) n from public.asset_maintenance group by status) s),'[]'::jsonb)
 )
 );
end $$;

-- Condition-check summary for employees; no maintenance or management metrics.
create or replace function public.get_asset_checklist_summary(p_date date default (now() at time zone 'Asia/Kuala_Lumpur')::date) returns jsonb
language sql stable security invoker set search_path=pg_catalog,public as $$
 select jsonb_build_object('checkDate',p_date,'checklist',coalesce((select jsonb_agg(jsonb_build_object(
 'id',l.id,'name',l.source_name,'kind',l.kind,
 'open',coalesce((select d.is_open from public.asset_calendar_days d where d.location_id=l.id and d.business_date=p_date),l.kind='branch'),
 'reason',(select d.reason from public.asset_calendar_days d where d.location_id=l.id and d.business_date=p_date),
 'expected',(select count(*) from public.asset_holdings h where h.location_id=l.id and (h.quantity is null or h.quantity>0)),
 'checked',(select count(*) from public.asset_holdings h where h.location_id=l.id and (h.quantity is null or h.quantity>0) and exists(select 1 from public.asset_daily_checks c where c.location_id=l.id and c.asset_id=h.asset_id and c.check_date=p_date))) order by l.source_name) from public.asset_locations l),'[]'::jsonb))
$$;
revoke all on function public.get_asset_checklist_summary(date) from public,anon;
grant execute on function public.get_asset_checklist_summary(date) to authenticated;

create or replace function public.report_asset_maintenance(p_asset uuid,p_location uuid,p_description text,p_priority text,p_client_key uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare company uuid:=public.current_staff_company_id(); result uuid; existing public.asset_maintenance;
begin
 if not public.asset_management_role() then raise exception 'Asset management role required'; end if;
 if not public.has_permission('assets.maintenance') or not public.asset_location_access(p_location) then raise exception 'Maintenance permission denied'; end if;
 if not exists(select 1 from public.asset_holdings where company_id=company and asset_id=p_asset and location_id=p_location and (quantity is null or quantity>0)) then raise exception 'Asset not held at this location'; end if;
 if length(trim(coalesce(p_description,''))) not between 1 and 4000 or p_priority is null or p_priority not in ('Low','Normal','High','Urgent') or p_client_key is null then raise exception 'Invalid maintenance details'; end if;
 select * into existing from public.asset_maintenance where company_id=company and source_id='OMS-'||p_client_key;
 if found then
  if existing.asset_id<>p_asset or existing.location_id<>p_location or existing.description<>trim(p_description) or existing.priority<>p_priority then raise exception 'Maintenance key was reused with different details'; end if;
  return existing.id;
 end if;
 insert into public.asset_maintenance(company_id,asset_id,location_id,source_id,status,priority,description,author_name,source_data)
 values(company,p_asset,p_location,'OMS-'||p_client_key,'Open',p_priority,trim(p_description),coalesce((select full_name from public.staffs where id=public.current_staff_id()),'OMS staff'),jsonb_build_object('Actor ID',public.current_staff_id(),'Created Date',(now() at time zone 'Asia/Kuala_Lumpur')::text)) returning id into result;
 return result;
end $$;


create or replace function public.update_asset_maintenance(p_request uuid,p_status text,p_comment text,p_client_key uuid,p_expected_status text) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare m public.asset_maintenance; existing public.asset_maintenance_updates; actor uuid:=public.current_staff_id();
begin
 if not public.asset_management_role() then raise exception 'Asset management role required'; end if;
 select * into m from public.asset_maintenance where id=p_request and company_id=public.current_staff_company_id() for update;
 if not found or not public.has_permission('assets.maintenance') or not public.asset_location_access(m.location_id) then raise exception 'Maintenance request unavailable'; end if;
 if p_status is null or p_status not in ('Open','Assigned','Closed','Resolved','Cancelled') or length(trim(coalesce(p_comment,''))) not between 1 and 4000 then raise exception 'Enter a status and update note'; end if;
 if p_client_key is null then raise exception 'Maintenance update key required'; end if;
 select * into existing from public.asset_maintenance_updates where company_id=m.company_id and source_id='OMS-'||p_client_key;
 if found then
  if existing.maintenance_id<>m.id or existing.source_data->>'Status After'<>p_status or existing.source_data->>'Comment'<>trim(p_comment) then raise exception 'Maintenance update key reused with different details'; end if;
  return m.id;
 end if;
 if p_expected_status is distinct from m.status then raise exception 'Maintenance status changed; refresh before updating'; end if;
 if p_status<>m.status and not public.has_permission('assets.manage') then raise exception 'Only an asset manager may change maintenance status'; end if;
 insert into public.asset_maintenance_updates(company_id,maintenance_id,source_id,author_name,source_data) values(m.company_id,m.id,'OMS-'||p_client_key,coalesce((select full_name from public.staffs where id=actor),'OMS staff'),jsonb_build_object('Status Before',m.status,'Status After',p_status,'Comment',trim(p_comment),'Actor ID',actor,'Update Date',(now() at time zone 'Asia/Kuala_Lumpur')::text));
 update public.asset_maintenance set status=p_status where id=m.id;
 return m.id;
end $$;


-- The imported JSON includes the original outlet and its quantity. Column ACLs
-- prevent direct API reads from bypassing scoped presentation after a transfer.
create or replace function public.asset_original_record_access(p_asset uuid) returns boolean
language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select 1 from public.assets a where a.id=p_asset
 and a.company_id=public.current_staff_company_id()
 and public.asset_company_live(a.company_id) and public.has_permission('assets.view')
 and (public.current_staff_has_company_role(array['super_admin']) or
 exists(select 1 from public.asset_locations l where l.company_id=a.company_id
 and l.source_name=a.source_data->>'Location' and public.asset_location_access(l.id))))
$$;
revoke all on function public.asset_original_record_access(uuid) from public,anon;
grant execute on function public.asset_original_record_access(uuid) to authenticated;

revoke select on public.assets from authenticated;
grant select(id,company_id,asset_code,item_name,current_details,import_batch_id,created_at,updated_at) on public.assets to authenticated;

create or replace function public.get_asset_identity(p_asset uuid) returns jsonb
language sql stable security definer set search_path=pg_catalog,public as $$
 select jsonb_build_object('id',a.id,'asset_code',a.asset_code,'item_name',a.item_name,
 'current_details',a.current_details,'updated_at',a.updated_at,
 'source_data',case when public.asset_original_record_access(a.id) then a.source_data else '{}'::jsonb end,
 'original_record_access',public.asset_original_record_access(a.id))
 from public.assets a where a.id=p_asset and a.company_id=public.current_staff_company_id()
 and public.asset_company_live(a.company_id) and public.has_permission('assets.view')
 and (public.current_staff_has_company_role(array['super_admin'])
 or exists(select 1 from public.asset_holdings h where h.asset_id=a.id and h.company_id=a.company_id and public.asset_location_access(h.location_id))
 or exists(select 1 from public.asset_transfers t where t.asset_id=a.id and t.company_id=a.company_id and (public.asset_location_access(t.from_location_id) or public.asset_location_access(t.to_location_id))))
$$;
revoke all on function public.get_asset_identity(uuid) from public,anon;
grant execute on function public.get_asset_identity(uuid) to authenticated;

alter policy asset_master_updates_read on public.asset_master_updates using (
 company_id=(select public.current_staff_company_id())
 and public.asset_original_record_access(asset_id)
 and exists(select 1 from public.assets a where a.id=asset_id)
);

-- Unlocated legacy attachments cannot inherit access just from a shared ID.
alter policy asset_attachments_read on public.asset_attachments using (
 company_id=(select public.current_staff_company_id())
 and exists(select 1 from public.assets a where a.id=asset_id)
 and (location_id is not null and public.asset_location_access(location_id)
      or location_id is null and public.asset_original_record_access(asset_id))
 and (maintenance_id is null or exists(select 1 from public.asset_maintenance m where m.id=maintenance_id))
);
