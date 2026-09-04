-- Repair a partially promoted Compliance rollout without duplicating records.

update public.compliance_types
set type_name = case type_code
  when 'TENANCY_AGREEMENT' then 'Tenancy Agreement'
  when 'DBKL' then 'DBKL Licence'
  when 'BUSINESS_LICENSE' then 'Business License'
  when 'FIRE_EXTINGUISHER' then 'Fire Extinguisher'
  when 'POS_LICENSE' then 'POS License'
  when 'BOMBA' then 'BOMBA Certificate'
  when 'FOSIM' then 'FOSIM'
  when 'PEST_CONTROL' then 'Pest Control'
  else type_name
end
where type_code in ('TENANCY_AGREEMENT','DBKL','BUSINESS_LICENSE','FIRE_EXTINGUISHER','POS_LICENSE','BOMBA','FOSIM','PEST_CONTROL');

insert into public.outlet_compliance_requirements(company_id,branch_id,compliance_type_id,is_required)
select b.company_id,b.id,t.id,true
from public.branches b
join public.compliance_types t on t.company_id=b.company_id
where b.branch_type in ('outlet','central_kitchen')
  and b.status='active' and b.deleted_at is null
  and t.subject_kind='outlet' and t.module_scope='outlet'
  and t.is_required and t.status='active' and t.deleted_at is null
on conflict(branch_id,compliance_type_id) do update set is_required=true;

alter table public.compliance_record_history
  drop constraint if exists compliance_record_history_event_type_check;
alter table public.compliance_record_history
  add constraint compliance_record_history_event_type_check check (event_type in (
    'created','updated','submitted','approved','rejected','renewed',
    'attachment_opened','attachment_downloaded','attachment_uploaded','attachment_archived'
  ));

drop policy if exists "tenant attachments create" on public.attachments;
create policy "tenant attachments create" on public.attachments for insert to authenticated with check(
  company_id=public.current_staff_company_id() and (
    (entity_type='compliance_record' and public.has_any_permission(array['outlet_compliance.upload','outlet_compliance.manage','people.compliance.manage']))
    or (entity_type<>'compliance_record' and public.has_permission('documents.attach'))));

drop policy if exists "tenant attachments update" on public.attachments;
create policy "tenant attachments update" on public.attachments for update to authenticated
using(company_id=public.current_staff_company_id() and (
  (entity_type='compliance_record' and public.has_any_permission(array['outlet_compliance.upload','outlet_compliance.manage','people.compliance.manage']))
  or (entity_type<>'compliance_record' and public.has_permission('documents.attach'))))
with check(company_id=public.current_staff_company_id() and (
  (entity_type='compliance_record' and public.has_any_permission(array['outlet_compliance.upload','outlet_compliance.manage','people.compliance.manage']))
  or (entity_type<>'compliance_record' and public.has_permission('documents.attach'))));

notify pgrst, 'reload schema';
