-- Repair the People Operations login boundary introduced across migrations 228-229.
-- Authentication can succeed before a workspace is available when the role lacks
-- both the new People permissions and the shared dashboard landing permission.

insert into public.roles(company_id,role_code,role_name,description,status)
select company.id,'people_operations','People Operations','Staff administration and restricted compliance records.','active'
from public.companies company
on conflict(company_id,role_code) do update
set role_name=excluded.role_name,description=excluded.description,status='active',deleted_at=null;

insert into public.role_permissions(role_id,permission_id)
select role.id,permission.id
from public.roles role
join public.permissions permission on permission.permission_code in (
  'dashboard.view',
  'outlet_compliance.read','outlet_compliance.upload','outlet_compliance.document.read','outlet_compliance.manage','outlet_compliance.review',
  'people.read','people.compliance.status.read','people.compliance.manage','people.compliance.document.read',
  'staffs.read','staffs.create','staffs.update','branches.read','documents.read','documents.view','documents.attach'
)
where role.role_code='people_operations' and role.status='active' and role.deleted_at is null
on conflict(role_id,permission_id) do nothing;

notify pgrst,'reload schema';
