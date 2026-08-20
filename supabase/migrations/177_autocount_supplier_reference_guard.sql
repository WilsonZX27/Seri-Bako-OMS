-- Do not allow an old or directly-called ready job to promote an Item Group
-- into an internal supplier identity when no AutoCount creditor reference was
-- supplied. The Preview analyzer has the same guard with row-level guidance;
-- this database guard protects the atomic Confirm RPC from bypasses.
do $$
declare
  definition text;
  needle text := 'for row_record in select * from public.autocount_import_rows where job_id = job.id and entity_type = ''supplier'' order by source_row loop';
  replacement text := needle || E'\n    if jsonb_array_length(coalesce(row_record.normalized->''external_refs'', ''[]''::jsonb)) = 0 then\n      raise exception ''AutoCount supplier % has no authoritative creditor reference. Repair the source export before confirming.'', row_record.normalized->>''supplier_group'' using errcode = ''23514'';\n    end if;';
begin
  definition := pg_get_functiondef('public.apply_autocount_import_job(uuid)'::regprocedure);
  if position(needle in definition) = 0 then
    raise exception 'apply_autocount_import_job supplier loop shape changed; reference guard is unsafe';
  end if;
  if position('has no authoritative creditor reference' in definition) > 0 then
    return;
  end if;
  definition := replace(definition, needle, replacement);
  execute definition;
end $$;

comment on function public.apply_autocount_import_job(uuid) is
  'Atomic tenant-scoped AutoCount Confirm; rejects staged supplier groups without authoritative creditor references.';
