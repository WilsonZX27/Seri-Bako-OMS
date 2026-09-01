-- Add FOSIM as a required outlet compliance record for every active outlet.

insert into public.compliance_types (
  company_id, type_code, type_name, subject_kind, module_scope,
  is_required, document_required, display_order, is_sensitive
)
select
  c.id, 'FOSIM', 'FOSIM - Food Safety Information System of Malaysia',
  'outlet', 'outlet', true, true, 80, false
from public.companies c
on conflict (company_id, type_code) do update set
  type_name = excluded.type_name,
  module_scope = 'outlet',
  is_required = true,
  document_required = true,
  display_order = excluded.display_order,
  deleted_at = null,
  status = 'active';

insert into public.outlet_compliance_requirements (company_id, branch_id, compliance_type_id)
select b.company_id, b.id, t.id
from public.branches b
join public.compliance_types t
  on t.company_id = b.company_id
 and t.type_code = 'FOSIM'
where b.branch_type = 'outlet'
  and b.deleted_at is null
on conflict (branch_id, compliance_type_id) do update set
  is_required = true,
  waiver_reason = null;

notify pgrst, 'reload schema';
