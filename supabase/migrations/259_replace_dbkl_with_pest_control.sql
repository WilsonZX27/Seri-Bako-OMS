-- Replace the retired DBKL checklist item with Pest Control for every active site.

update public.outlet_compliance_requirements r
set is_required = false,
    waiver_reason = 'Requirement retired: DBKL removed from the company checklist.'
from public.compliance_types t
where t.id = r.compliance_type_id
  and t.type_code = 'DBKL';

update public.compliance_types
set status = 'inactive',
    is_required = false,
    deleted_at = coalesce(deleted_at, now()),
    updated_at = now()
where type_code = 'DBKL';

insert into public.compliance_types (
  company_id, type_code, type_name, subject_kind, module_scope,
  is_required, document_required, display_order, is_sensitive
)
select
  c.id, 'PEST_CONTROL', 'Pest Control', 'outlet', 'outlet',
  true, true, 80, false
from public.companies c
on conflict (company_id, type_code) do update set
  type_name = 'Pest Control',
  subject_kind = 'outlet',
  module_scope = 'outlet',
  is_required = true,
  document_required = true,
  display_order = 80,
  deleted_at = null,
  status = 'active',
  updated_at = now();

insert into public.outlet_compliance_requirements (
  company_id, branch_id, compliance_type_id, is_required
)
select b.company_id, b.id, t.id, true
from public.branches b
join public.compliance_types t
  on t.company_id = b.company_id
 and t.type_code = 'PEST_CONTROL'
where b.branch_type in ('outlet', 'central_kitchen')
  and b.status = 'active'
  and b.deleted_at is null
on conflict (branch_id, compliance_type_id) do update set
  is_required = true,
  waiver_reason = null;

notify pgrst, 'reload schema';
