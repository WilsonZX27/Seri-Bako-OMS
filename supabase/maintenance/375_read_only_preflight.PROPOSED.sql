SELECT jsonb_build_object(
  'collected_at', clock_timestamp(),
  'database', current_database(),
  'executor', current_user,
  'functions', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'signature', p.oid::regprocedure::text,
      'definition', pg_get_functiondef(p.oid),
      'definition_md5', md5(pg_get_functiondef(p.oid)),
      'owner', pg_get_userbyid(p.proowner),
      'acl', p.proacl, 'config', p.proconfig,
      'security_definer', p.prosecdef
    ) ORDER BY p.oid::regprocedure::text)
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prokind = 'f' AND (
      (n.nspname = 'public' AND p.proname IN (
        'select_unassigned_purchase_request_supplier',
        'resolve_purchase_request_unresolved_line',
        'current_staff_company_id', 'current_staff_role_codes',
        'has_permission', 'has_any_permission', 'can_access_purchase_request'
      )) OR (n.nspname = 'auth' AND p.proname = 'uid')
      OR p.oid IN (
        SELECT t.tgfoid FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace ns ON ns.oid = c.relnamespace
        WHERE ns.nspname = 'public'
          AND c.relname IN ('purchase_requests', 'activity_logs')
          AND NOT t.tgisinternal
      )
    )
  ), '[]'::jsonb),
  'relations', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'name', c.relname, 'kind', c.relkind,
      'owner', pg_get_userbyid(c.relowner),
      'acl', c.relacl, 'rls', c.relrowsecurity,
      'force_rls', c.relforcerowsecurity,
      'columns', (SELECT jsonb_agg(jsonb_build_object(
        'name', a.attname, 'type', format_type(a.atttypid,a.atttypmod),
        'not_null', a.attnotnull, 'default', pg_get_expr(d.adbin,d.adrelid)
      ) ORDER BY a.attnum)
        FROM pg_attribute a LEFT JOIN pg_attrdef d
          ON d.adrelid = a.attrelid AND d.adnum = a.attnum
        WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped),
      'constraints', (SELECT jsonb_agg(pg_get_constraintdef(k.oid) ORDER BY k.conname)
        FROM pg_constraint k WHERE k.conrelid = c.oid),
      'policies', (SELECT jsonb_agg(jsonb_build_object(
        'name', q.polname, 'command', q.polcmd, 'roles', q.polroles,
        'using', pg_get_expr(q.polqual,q.polrelid),
        'check', pg_get_expr(q.polwithcheck,q.polrelid)
      ) ORDER BY q.polname) FROM pg_policy q WHERE q.polrelid = c.oid),
      'triggers', (SELECT jsonb_agg(pg_get_triggerdef(t.oid) ORDER BY t.tgname)
        FROM pg_trigger t WHERE t.tgrelid = c.oid AND NOT t.tgisinternal)
    ) ORDER BY c.relname)
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname IN (
      'staffs', 'purchase_requests', 'purchase_request_lines',
      'purchase_request_unresolved_lines', 'suppliers', 'items',
      'supplier_items', 'branch_supplier_items', 'activity_logs',
      'staff_roles', 'roles', 'permissions', 'role_permissions',
      'staff_permission_overrides', 'staff_branches'
    )
  ), '[]'::jsonb),
  'function_default_acl', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'owner', pg_get_userbyid(d.defaclrole), 'schema', n.nspname, 'acl', d.defaclacl
    ) ORDER BY d.defaclrole,d.defaclnamespace)
    FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
    WHERE d.defaclobjtype = 'f' AND (d.defaclnamespace = 0 OR n.nspname = 'public')
  ), '[]'::jsonb)
) AS supplier_recovery_preflight;
