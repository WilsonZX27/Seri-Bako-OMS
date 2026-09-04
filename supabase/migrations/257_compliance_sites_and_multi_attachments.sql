-- Converge compliance labels, site coverage, and legacy attachment ownership.

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

update public.attachments a
set entity_type='compliance_record', entity_id=r.id, updated_at=now()
from public.compliance_records r
where r.attachment_id=a.id
  and a.company_id=r.company_id
  and (a.entity_type is distinct from 'compliance_record' or a.entity_id is distinct from r.id);

drop policy if exists "tenant attachments update" on public.attachments;
create policy "tenant attachments update" on public.attachments for update to authenticated
using(company_id=public.current_staff_company_id() and (
  (entity_type='compliance_record' and public.has_any_permission(array['outlet_compliance.upload','outlet_compliance.manage','people.compliance.manage']))
  or (entity_type<>'compliance_record' and public.has_permission('documents.attach'))))
with check(company_id=public.current_staff_company_id() and (
  (entity_type='compliance_record' and public.has_any_permission(array['outlet_compliance.upload','outlet_compliance.manage','people.compliance.manage']))
  or (entity_type<>'compliance_record' and public.has_permission('documents.attach'))));

notify pgrst, 'reload schema';
