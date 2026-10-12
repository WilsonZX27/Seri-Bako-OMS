-- Read-only Production audit for migration 303.
select
  version,
  name
from supabase_migrations.schema_migrations
where version = '303';

select
  procedure.proname,
  procedure.prosecdef as security_definer,
  pg_get_function_result(procedure.oid) as result_type,
  has_function_privilege('authenticated', procedure.oid, 'EXECUTE') as authenticated_execute,
  has_function_privilege('anon', procedure.oid, 'EXECUTE') as anon_execute,
  position('supplier_invoice.view' in pg_get_functiondef(procedure.oid)) > 0 as has_permission_guard,
  position('payment.company_id = actor.company_id' in pg_get_functiondef(procedure.oid)) > 0 as payment_tenant_scope,
  position('invoice.company_id = actor.company_id' in pg_get_functiondef(procedure.oid)) > 0 as invoice_tenant_scope
from pg_proc procedure
join pg_namespace namespace on namespace.oid = procedure.pronamespace
where namespace.nspname = 'public'
  and procedure.proname = 'get_supplier_invoice_queue_summary'
  and pg_get_function_identity_arguments(procedure.oid) = '';

