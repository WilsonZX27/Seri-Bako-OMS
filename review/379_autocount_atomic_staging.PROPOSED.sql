-- PROPOSAL 379 ONLY: reserved separately from Settings 378; installation requires approval.
-- Preserve job IDs and completed receipts. Replace only uncommitted staging children.
begin;
create function public.stage_autocount_import_job(
 p_content_hash text, p_files jsonb, p_rows jsonb, p_summary jsonb, p_blocking_issues jsonb
) returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare
 actor public.staffs%rowtype;
 job public.autocount_import_jobs%rowtype;
 reused boolean;
 expected_hash text;
 files_digest text;
 rows_digest text;
begin
 select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null;
 if actor.id is null or not public.has_permission('imports.create') then raise exception 'Missing permission: imports.create' using errcode='42501'; end if;
 if jsonb_typeof(p_files) is distinct from 'array' or jsonb_typeof(p_rows) is distinct from 'array'
 or jsonb_typeof(p_summary) is distinct from 'object' or jsonb_typeof(p_blocking_issues) is distinct from 'array' then
 raise exception 'Invalid staging payload' using errcode='22023'; end if;
 if jsonb_array_length(p_files) not between 1 and 20 or jsonb_array_length(p_rows)>300000 then raise exception 'Invalid staging size' using errcode='22023'; end if;
 select 'autocount-v2:'||string_agg(f->>'content_hash', ':' order by f->>'content_hash') into expected_hash from jsonb_array_elements(p_files) f;
 if p_content_hash is distinct from expected_hash then raise exception 'Invalid staging identity' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor.company_id::text||':'||p_content_hash,0));
 select * into job from public.autocount_import_jobs where company_id=actor.company_id and content_hash=p_content_hash
 and status in ('staging','ready','applying','completed') for update;
 reused := job.id is not null;
 if job.status='completed' then
 return jsonb_build_object('jobId',job.id,'status',job.status,'summary',job.summary,'blockingIssues',job.blocking_issues,'reused',true);
 end if;
 if job.status='applying' then raise exception 'Import already applying; check status before retrying' using errcode='55000'; end if;
 if job.id is null then
 insert into public.autocount_import_jobs(company_id,created_by,status,content_hash,file_count)
 values(actor.company_id,actor.id,'staging',p_content_hash,jsonb_array_length(p_files)) returning * into job;
 else
 -- Existing RLS still requires the original creator for editing a staging job.
 update public.autocount_import_jobs set status='staging' where id=job.id;
 delete from public.autocount_import_rows where job_id=job.id;
 delete from public.autocount_import_files where job_id=job.id;
 end if;
 insert into public.autocount_import_files(job_id,company_id,file_name,file_type,content_hash,row_count,headers)
 select job.id,actor.company_id,f.file_name,f.file_type,f.content_hash,f.row_count,f.headers
 from jsonb_to_recordset(p_files) f(file_name text,file_type text,content_hash text,row_count integer,headers jsonb);
 insert into public.autocount_import_rows(job_id,company_id,entity_type,business_key,source_file,source_row,normalized,warnings)
 select job.id,actor.company_id,r.entity_type,r.business_key,r.source_file,r.source_row,r.normalized,r.warnings
 from jsonb_to_recordset(p_rows) r(entity_type text,business_key text,source_file text,source_row integer,normalized jsonb,warnings jsonb);
 select md5(coalesce(jsonb_agg(jsonb_build_array(file_name,file_type,content_hash,row_count,headers) order by content_hash),'[]'::jsonb)::text)
 into files_digest from public.autocount_import_files where job_id=job.id;
 select md5(coalesce(jsonb_agg(jsonb_build_array(entity_type,business_key,source_file,source_row,normalized,warnings) order by entity_type,business_key),'[]'::jsonb)::text)
 into rows_digest from public.autocount_import_rows where job_id=job.id;
 update public.autocount_import_jobs set
 status=case when jsonb_array_length(p_blocking_issues)=0 then 'ready' else 'staging' end,
 file_count=jsonb_array_length(p_files),blocking_issues=p_blocking_issues,
 summary=p_summary||jsonb_build_object('stagingVersion',1,'stagedRows',jsonb_array_length(p_rows),'filesDigest',files_digest,'rowsDigest',rows_digest)
 where id=job.id returning * into job;
 return jsonb_build_object('jobId',job.id,'status',job.status,'summary',job.summary,'blockingIssues',job.blocking_issues,'reused',reused);
end $$;
revoke all on function public.stage_autocount_import_job(text,jsonb,jsonb,jsonb,jsonb) from public, anon, service_role;
grant execute on function public.stage_autocount_import_job(text,jsonb,jsonb,jsonb,jsonb) to authenticated;

-- Fail closed if the existing apply function has changed; preserve its ACL and business logic.
do $patch$
declare definition text; marker text := 'update public.autocount_import_jobs set status = ''applying'', confirmed_at = now() where id = job.id;'; guard text := $guard$
  -- Recheck the immutable staging receipt while holding the existing job lock.
  if job.summary->>'stagingVersion' is distinct from '1'
    or job.summary->>'stagedRows' is distinct from (select count(*)::text from public.autocount_import_rows where job_id=job.id)
    or job.file_count is distinct from (select count(*)::integer from public.autocount_import_files where job_id=job.id)
    or job.summary->>'filesDigest' is distinct from (select md5(coalesce(jsonb_agg(jsonb_build_array(file_name,file_type,content_hash,row_count,headers) order by content_hash),'[]'::jsonb)::text) from public.autocount_import_files where job_id=job.id)
    or job.summary->>'rowsDigest' is distinct from (select md5(coalesce(jsonb_agg(jsonb_build_array(entity_type,business_key,source_file,source_row,normalized,warnings) order by entity_type,business_key),'[]'::jsonb)::text) from public.autocount_import_rows where job_id=job.id)
  then raise exception 'Incomplete staging; upload the same files and review again' using errcode='23514'; end if;
$guard$;
begin
 definition:=pg_get_functiondef('public.apply_autocount_import_job(uuid)'::regprocedure);
 if md5(definition)<>'0e743e20652e9a40e423fcb358146819' then raise exception 'Apply definition differs from reviewed production fingerprint; re-review required'; end if;
 if position('Recheck the immutable staging receipt' in definition)>0 then raise exception 'Guard already present; inspect installed definition'; end if;
 if (length(definition)-length(replace(definition,marker,'')))/length(marker)<>1 then raise exception 'Apply definition changed; unsafe to patch'; end if;
 execute replace(definition,marker,guard||marker);
end $patch$;
commit;
