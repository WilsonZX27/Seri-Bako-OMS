-- REVIEW ONLY. No remote execution. v2 requires the complete versioned batch contract.
-- Automatic numbering intentionally disabled pending allocator-eligibility review.
begin;
create function public.asset_feature_capabilities() returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare company uuid:=public.current_staff_company_id(); ready boolean;
begin
 if company is null or public.current_staff_id() is null then raise exception 'Active staff required'; end if;
 select
   not exists (
     select 1 from (values
       ('public.request_asset_transfer_batch(uuid,uuid,text,jsonb,uuid,text,date)'),
       ('public.advance_asset_transfer_batch(uuid,text,text)')
     ) expected(signature)
     where not exists (
       select 1 from pg_proc p where p.oid=to_regprocedure(expected.signature)
       and p.prorettype='uuid'::regtype and not p.proretset and p.prosecdef
       and p.proconfig @> array['search_path=pg_catalog, public']
       and obj_description(p.oid,'pg_proc')='oms.asset-batch.v1'
       and has_function_privilege('authenticated',p.oid,'EXECUTE')
       and not has_function_privilege('anon',p.oid,'EXECUTE')
     )
   )
   and not exists (
     select 1 from (values
       ('public.request_asset_transfer(uuid,uuid,uuid,integer,text,uuid)','uuid'),
       ('public.advance_asset_transfer(uuid,text,text)','uuid'),
       ('public.register_asset_other_location(text)','uuid'),
       ('public.asset_location_access(uuid)','boolean'),
       ('public.has_permission(text)','boolean'),
       ('public.current_staff_company_id()','uuid'),('public.current_staff_id()','uuid')
     ) expected(signature,type_name)
     where not exists (select 1 from pg_proc p where p.oid=to_regprocedure(expected.signature)
       and p.prorettype=to_regtype(expected.type_name) and not p.proretset)
   )
   and exists (select 1 from pg_class c where c.oid=to_regclass('public.asset_transfer_batches') and c.relkind='r' and c.relrowsecurity)
   and exists (select 1 from pg_trigger t where t.tgrelid=to_regclass('public.asset_transfers') and t.tgname='guard_asset_transfer_batch_line' and not t.tgisinternal and t.tgenabled='O')
   and exists (select 1 from pg_class c where c.oid=to_regclass('public.asset_transfer_register') and c.relkind='v'
     and c.reloptions @> array['security_invoker=true'] and obj_description(c.oid,'pg_class')='oms.asset-batch.v1'
     and has_table_privilege('authenticated',c.oid,'SELECT'))
   and not exists (
     select 1 from (values
       ('asset_transfer_register','id','uuid'),('asset_transfer_register','batch_id','uuid'),
       ('asset_transfer_register','company_id','uuid'),('asset_transfer_register','asset_id','uuid'),
       ('asset_transfer_register','from_location_id','uuid'),('asset_transfer_register','to_location_id','uuid'),
       ('asset_transfer_register','status','text'),('asset_transfer_register','reason','text'),
       ('asset_transfer_register','quantity','bigint'),('asset_transfer_register','line_count','integer'),
       ('asset_transfer_register','author_name','text'),('asset_transfer_register','created_at','timestamp with time zone'),
       ('asset_transfer_register','source_data','jsonb'),('asset_transfers','batch_id','uuid'),
       ('asset_transfer_batches','request_date','date'),('asset_transfer_batches','client_key','uuid')
     ) expected(relation,column_name,type_name)
     where not exists (select 1 from pg_attribute a where a.attrelid=to_regclass('public.'||expected.relation)
       and a.attname=expected.column_name and not a.attisdropped and a.atttypid=to_regtype(expected.type_name))
   ) into ready;
 return jsonb_build_object('version',2,'automatic_id',false,
   'transfer_batch',ready,'transfer_batch_revision',case when ready then 1 else 0 end);
end $$;
revoke all on function public.asset_feature_capabilities() from public,anon;
grant execute on function public.asset_feature_capabilities() to authenticated;
rollback; -- review only
