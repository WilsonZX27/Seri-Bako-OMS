-- v9.2 Outlet Management, People Operations, and sales reconciliation.

alter table public.compliance_types add column if not exists module_scope text not null default 'outlet';
alter table public.compliance_types add column if not exists is_required boolean not null default false;
alter table public.compliance_types add column if not exists document_required boolean not null default true;
alter table public.compliance_types add column if not exists display_order integer not null default 100;
alter table public.compliance_types drop constraint if exists compliance_types_module_scope_check;
alter table public.compliance_types add constraint compliance_types_module_scope_check check (module_scope in ('outlet','people','asset'));

update public.compliance_types set module_scope=case when subject_kind='staff' then 'people' when subject_kind='asset' then 'asset' else 'outlet' end;
update public.compliance_types set is_required=true, display_order=case type_code
  when 'BOMBA' then 10 when 'BUSINESS_LICENSE' then 20 when 'DBKL' then 30 when 'TENANCY_AGREEMENT' then 40
  when 'INSURANCE' then 50 when 'FIRE_EXTINGUISHER' then 60 when 'POS_LICENSE' then 70 else display_order end
where subject_kind='outlet';

insert into public.compliance_types(company_id,type_code,type_name,subject_kind,module_scope,is_required,document_required,display_order,is_sensitive)
select c.id,seed.code,seed.name,'outlet','outlet',true,true,seed.sort,false from public.companies c cross join (values
  ('BOMBA','BOMBA certificate',10),('DBKL','DBKL licence',30),('TENANCY_AGREEMENT','Tenancy agreement',40)
) seed(code,name,sort)
on conflict(company_id,type_code) do update set module_scope='outlet',is_required=true,document_required=true,display_order=excluded.display_order;

create table if not exists public.outlet_compliance_requirements (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
  branch_id uuid not null references public.branches(id), compliance_type_id uuid not null references public.compliance_types(id),
  is_required boolean not null default true, waiver_reason text, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), unique(branch_id,compliance_type_id)
);
drop trigger if exists set_outlet_compliance_requirements_updated_at on public.outlet_compliance_requirements;
create trigger set_outlet_compliance_requirements_updated_at before update on public.outlet_compliance_requirements
for each row execute function public.set_updated_at();
insert into public.outlet_compliance_requirements(company_id,branch_id,compliance_type_id)
select b.company_id,b.id,t.id from public.branches b join public.compliance_types t on t.company_id=b.company_id
where b.branch_type='outlet' and b.deleted_at is null and t.module_scope='outlet' and t.is_required and t.deleted_at is null
on conflict(branch_id,compliance_type_id) do nothing;

alter table public.outlet_daily_records add column if not exists pos_total_sales numeric(18,2);
alter table public.outlet_daily_records add column if not exists sales_variance_reason text;
alter table public.outlet_daily_records add column if not exists sales_review_status text not null default 'not_required';
alter table public.outlet_daily_records drop constraint if exists outlet_daily_sales_review_status_check;
alter table public.outlet_daily_records add constraint outlet_daily_sales_review_status_check check (sales_review_status in ('not_required','needs_review','reviewed'));
alter table public.outlet_daily_records drop constraint if exists outlet_daily_pos_total_nonnegative;
alter table public.outlet_daily_records add constraint outlet_daily_pos_total_nonnegative check (pos_total_sales is null or pos_total_sales >= 0);

create table if not exists public.outlet_daily_sales_breakdowns (
  id uuid primary key default gen_random_uuid(), record_id uuid not null references public.outlet_daily_records(id) on delete cascade,
  channel text not null check (channel in ('duitnow','credit_card','voucher','grabfood','foodpanda')),
  amount numeric(18,2) not null default 0 check(amount>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(record_id,channel)
);
drop trigger if exists set_outlet_daily_sales_breakdowns_updated_at on public.outlet_daily_sales_breakdowns;
create trigger set_outlet_daily_sales_breakdowns_updated_at before update on public.outlet_daily_sales_breakdowns
for each row execute function public.set_updated_at();

insert into public.permissions(permission_code,module,action,description) values
 ('outlet_compliance.read','outlet_compliance','read','View assigned outlet checklist status'),
 ('outlet_compliance.upload','outlet_compliance','upload','Upload assigned outlet checklist evidence'),
 ('outlet_compliance.document.read','outlet_compliance','document_read','Open outlet compliance evidence'),
 ('outlet_compliance.manage','outlet_compliance','manage','Manage outlet compliance records'),
 ('outlet_compliance.review','outlet_compliance','review','Review outlet compliance evidence'),
 ('people.read','people','read','View permitted employee profiles'),
 ('people.compliance.status.read','people','compliance_status_read','View permitted employee compliance status'),
 ('people.compliance.manage','people','compliance_manage','Manage employee compliance records'),
 ('people.compliance.document.read','people','document_read','Open sensitive employee compliance evidence')
on conflict(permission_code) do update set description=excluded.description;

delete from public.role_permissions rp using public.roles r,public.permissions p
where rp.role_id=r.id and rp.permission_id=p.id and p.permission_code like 'compliance.%' and r.role_code in ('kitchen','outlet_staff','purchasing','finance');
delete from public.role_permissions rp using public.roles r,public.permissions p
where rp.role_id=r.id and rp.permission_id=p.id and r.role_code in ('finance','purchasing','kitchen','outlet_staff')
 and p.permission_code in ('staffs.read','staffs.create','staffs.update','staff.view','staff.manage','people.read','people.compliance.status.read','people.compliance.manage','people.compliance.document.read');
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r join public.permissions p on
 (r.role_code='super_admin' and p.permission_code in ('outlet_compliance.read','outlet_compliance.upload','outlet_compliance.document.read','outlet_compliance.manage','outlet_compliance.review','people.read','people.compliance.status.read','people.compliance.manage','people.compliance.document.read'))
 or (r.role_code='people_operations' and p.permission_code in ('outlet_compliance.read','outlet_compliance.upload','outlet_compliance.document.read','outlet_compliance.manage','outlet_compliance.review','people.read','people.compliance.status.read','people.compliance.manage','people.compliance.document.read'))
 or (r.role_code='manager' and p.permission_code in ('outlet_compliance.read','outlet_compliance.upload','outlet_compliance.document.read','outlet_compliance.manage','outlet_compliance.review','people.read','people.compliance.status.read'))
 or (r.role_code='outlet_staff' and p.permission_code in ('outlet_compliance.read','outlet_compliance.upload'))
 or (r.role_code='kitchen' and p.permission_code='outlet_compliance.read')
on conflict(role_id,permission_id) do nothing;

create or replace function public.can_read_compliance_record(target public.compliance_records)
returns boolean language sql stable security definer set search_path=public as $$
 select target.company_id=public.current_staff_company_id() and (
   (target.subject_kind='outlet' and public.has_permission('outlet_compliance.read') and target.branch_id is not null and public.can_access_company_branch(target.company_id,target.branch_id))
   or (target.subject_kind='staff' and public.has_permission('people.compliance.status.read') and exists(
     select 1 from public.staffs s where s.id=target.staff_id and s.company_id=target.company_id and
       (public.has_permission('people.compliance.manage') or (s.default_branch_id is not null and public.can_access_company_branch(s.company_id,s.default_branch_id)) or exists(
         select 1 from public.staff_branches sb where sb.staff_id=s.id and public.can_access_company_branch(s.company_id,sb.branch_id)))))
   or (target.subject_kind='asset' and public.has_permission('compliance.read'))
 );
$$;

drop policy if exists "compliance types scoped read" on public.compliance_types;
create policy "compliance types scoped read" on public.compliance_types for select to authenticated using(
 company_id=public.current_staff_company_id() and (
  (module_scope='outlet' and public.has_permission('outlet_compliance.read')) or
  (module_scope='people' and public.has_permission('people.compliance.status.read')) or
  (module_scope='asset' and public.has_permission('compliance.read'))));
drop policy if exists "compliance records scoped insert" on public.compliance_records;
create policy "compliance records scoped insert" on public.compliance_records for insert to authenticated with check(
 company_id=public.current_staff_company_id() and (
  (subject_kind='outlet' and public.has_any_permission(array['outlet_compliance.upload','outlet_compliance.manage']) and branch_id is not null and public.can_access_company_branch(company_id,branch_id)) or
  (subject_kind='staff' and public.has_permission('people.compliance.manage')) or
  (subject_kind='asset' and public.has_permission('compliance.manage'))));
drop policy if exists "compliance records scoped update" on public.compliance_records;
create policy "compliance records scoped update" on public.compliance_records for update to authenticated
 using(public.can_read_compliance_record(compliance_records) and ((subject_kind='outlet' and public.has_any_permission(array['outlet_compliance.upload','outlet_compliance.manage','outlet_compliance.review'])) or (subject_kind='staff' and public.has_permission('people.compliance.manage')) or (subject_kind='asset' and public.has_permission('compliance.manage'))))
 with check(company_id=public.current_staff_company_id());
drop policy if exists "compliance history scoped insert" on public.compliance_record_history;
create policy "compliance history scoped insert" on public.compliance_record_history for insert to authenticated with check(
 company_id=public.current_staff_company_id() and actor_staff_id=public.current_staff_id() and public.has_any_permission(array['outlet_compliance.upload','outlet_compliance.manage','outlet_compliance.review','people.compliance.manage','compliance.manage']));

alter table public.outlet_compliance_requirements enable row level security;
create policy "outlet requirements scoped read" on public.outlet_compliance_requirements for select to authenticated
 using(company_id=public.current_staff_company_id() and public.has_permission('outlet_compliance.read') and public.can_access_company_branch(company_id,branch_id));
create policy "outlet requirements owner manage" on public.outlet_compliance_requirements for all to authenticated
 using(company_id=public.current_staff_company_id() and public.has_permission('compliance.types.manage'))
 with check(company_id=public.current_staff_company_id() and public.has_permission('compliance.types.manage'));
grant select on public.outlet_compliance_requirements to authenticated;

drop policy if exists "tenant attachments read" on public.attachments;
create policy "tenant attachments read" on public.attachments for select to authenticated using(
 company_id=public.current_staff_company_id() and (
  (entity_type='compliance_record' and exists(select 1 from public.compliance_records r where r.id=entity_id and ((r.subject_kind='outlet' and public.has_permission('outlet_compliance.document.read')) or (r.subject_kind='staff' and public.has_permission('people.compliance.document.read')))))
  or (entity_type<>'compliance_record' and public.has_permission('documents.read'))));
drop policy if exists "tenant attachments manage" on public.attachments;
drop policy if exists "tenant attachments create" on public.attachments;
drop policy if exists "tenant attachments update" on public.attachments;
drop policy if exists "tenant attachments delete" on public.attachments;
create policy "tenant attachments create" on public.attachments for insert to authenticated with check(
 company_id=public.current_staff_company_id() and ((entity_type='compliance_record' and public.has_any_permission(array['outlet_compliance.upload','people.compliance.manage'])) or (entity_type<>'compliance_record' and public.has_permission('documents.attach'))));
create policy "tenant attachments update" on public.attachments for update to authenticated
 using(company_id=public.current_staff_company_id() and ((entity_type='compliance_record' and public.has_any_permission(array['outlet_compliance.manage','people.compliance.manage'])) or (entity_type<>'compliance_record' and public.has_permission('documents.attach'))))
 with check(company_id=public.current_staff_company_id() and ((entity_type='compliance_record' and public.has_any_permission(array['outlet_compliance.manage','people.compliance.manage'])) or (entity_type<>'compliance_record' and public.has_permission('documents.attach'))));
create policy "tenant attachments delete" on public.attachments for delete to authenticated using(
 company_id=public.current_staff_company_id() and ((entity_type='compliance_record' and public.has_any_permission(array['outlet_compliance.manage','people.compliance.manage'])) or (entity_type<>'compliance_record' and public.has_permission('documents.attach'))));

drop policy if exists "document attachments read" on storage.objects;
create policy "document attachments read" on storage.objects for select to authenticated using(
 bucket_id='document-attachments' and (storage.foldername(name))[1]=public.current_staff_company_id()::text and (
  ((storage.foldername(name))[2]='compliance' and public.has_any_permission(array['outlet_compliance.document.read','people.compliance.document.read'])) or
  ((storage.foldername(name))[2]<>'compliance' and public.has_any_permission(array['documents.read','documents.view']))));
drop policy if exists "document attachments insert" on storage.objects;
create policy "document attachments insert" on storage.objects for insert to authenticated with check(
 bucket_id='document-attachments' and (storage.foldername(name))[1]=public.current_staff_company_id()::text and (
  ((storage.foldername(name))[2]='compliance' and public.has_any_permission(array['outlet_compliance.upload','people.compliance.manage'])) or
  ((storage.foldername(name))[2]<>'compliance' and public.has_any_permission(array['documents.attach','attachments.upload']))));

alter table public.outlet_daily_sales_breakdowns enable row level security;
create policy "outlet sales scoped read" on public.outlet_daily_sales_breakdowns for select to authenticated using(exists(
 select 1 from public.outlet_daily_records r where r.id=record_id and r.company_id=public.current_staff_company_id() and public.can_access_outlet_daily_branch(r.branch_id)));
grant select on public.outlet_daily_sales_breakdowns to authenticated;

create or replace function public.save_outlet_daily_record_v92(
 p_record_id uuid,p_branch_id uuid,p_record_date date,p_notes text,p_lines jsonb,p_target_status text,
 p_pos_total_sales numeric,p_sales_breakdown jsonb,p_sales_variance_reason text
) returns uuid language plpgsql security definer set search_path=public as $$
declare saved_id uuid; channel_row jsonb; channel_total numeric:=0; difference numeric; can_edit boolean:=public.has_permission('outlet_daily_record.update');
begin
 saved_id:=public.save_outlet_daily_record(p_record_id,p_branch_id,p_record_date,p_notes,p_lines,p_target_status);
 if can_edit then
   if p_pos_total_sales is null or p_pos_total_sales<0 then raise exception 'POS Total Sales is required and cannot be negative.'; end if;
   if jsonb_typeof(p_sales_breakdown)<>'array' or jsonb_array_length(p_sales_breakdown)<>5 then raise exception 'All five sales channels are required.'; end if;
   delete from public.outlet_daily_sales_breakdowns where record_id=saved_id;
   for channel_row in select value from jsonb_array_elements(p_sales_breakdown) loop
     if channel_row->>'channel' not in ('duitnow','credit_card','voucher','grabfood','foodpanda') then raise exception 'Invalid sales channel.'; end if;
     if coalesce((channel_row->>'amount')::numeric,0)<0 then raise exception 'Sales amounts cannot be negative.'; end if;
     insert into public.outlet_daily_sales_breakdowns(record_id,channel,amount) values(saved_id,channel_row->>'channel',coalesce((channel_row->>'amount')::numeric,0));
     channel_total:=channel_total+coalesce((channel_row->>'amount')::numeric,0);
   end loop;
   difference:=round(p_pos_total_sales-channel_total,2);
   if difference<>0 and nullif(trim(coalesce(p_sales_variance_reason,'')),'') is null then raise exception 'Explain the sales difference before completing this record.'; end if;
   update public.outlet_daily_records set pos_total_sales=round(p_pos_total_sales,2),sales_variance_reason=nullif(trim(coalesce(p_sales_variance_reason,'')),''),
     sales_review_status=case when difference=0 then 'not_required' else 'needs_review' end where id=saved_id;
 end if;
 return saved_id;
end $$;
revoke all on function public.save_outlet_daily_record_v92(uuid,uuid,date,text,jsonb,text,numeric,jsonb,text) from public,anon;
grant execute on function public.save_outlet_daily_record_v92(uuid,uuid,date,text,jsonb,text,numeric,jsonb,text) to authenticated;
notify pgrst,'reload schema';
