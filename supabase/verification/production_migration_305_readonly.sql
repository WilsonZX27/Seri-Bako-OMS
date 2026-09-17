select jsonb_build_object(
  'migration', 'retire_bomba_outlet_requirement',
  'active_bomba_types', (select count(*) from public.compliance_types where type_code = 'BOMBA' and status = 'active' and deleted_at is null),
  'required_bomba_assignments', (select count(*) from public.outlet_compliance_requirements r join public.compliance_types t on t.id = r.compliance_type_id where t.type_code = 'BOMBA' and r.is_required),
  'historical_bomba_records', (select count(*) from public.compliance_records r join public.compliance_types t on t.id = r.compliance_type_id where t.type_code = 'BOMBA')
);
