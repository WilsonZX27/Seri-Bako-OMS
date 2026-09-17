-- BOMBA and Fire Extinguisher represented the same company checklist need.
-- Retire BOMBA from every live outlet checklist while preserving its records
-- and attachments as historical evidence.

update public.outlet_compliance_requirements r
set is_required = false,
    waiver_reason = 'Requirement retired: BOMBA is covered by Fire Extinguisher.',
    updated_at = now()
from public.compliance_types t
where t.id = r.compliance_type_id
  and t.company_id = r.company_id
  and t.type_code = 'BOMBA';

update public.compliance_types
set status = 'inactive',
    is_required = false,
    deleted_at = coalesce(deleted_at, now()),
    updated_at = now()
where type_code = 'BOMBA';

notify pgrst, 'reload schema';
