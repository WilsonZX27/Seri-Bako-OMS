-- Historical forward-only ACL remediation for migration 111.
do $$
begin
  if to_regprocedure(
    'public.create_central_kitchen_purchase_request_atomic(jsonb)'
  ) is null then
    raise exception
      'Migration 112 requires create_central_kitchen_purchase_request_atomic(jsonb).';
  end if;
end;
$$;

revoke all on function
  public.create_central_kitchen_purchase_request_atomic(jsonb)
from public, anon;

grant execute on function
  public.create_central_kitchen_purchase_request_atomic(jsonb)
to authenticated;

do $$
begin
  if has_function_privilege(
    'anon',
    'public.create_central_kitchen_purchase_request_atomic(jsonb)',
    'execute'
  ) then
    raise exception
      'Migration 112 failed: anon can still execute the Central Kitchen PR RPC.';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.create_central_kitchen_purchase_request_atomic(jsonb)',
    'execute'
  ) then
    raise exception
      'Migration 112 failed: authenticated cannot execute the Central Kitchen PR RPC.';
  end if;
end;
$$;
