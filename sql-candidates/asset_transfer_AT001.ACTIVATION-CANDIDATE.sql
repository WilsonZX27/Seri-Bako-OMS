-- Separately approved single-company operation, NOT an automatic migration.
-- Requires installed numbering schema and psql -v target_company=<approved UUID>.
-- No production execution is authorised by choosing the display format.
\set ON_ERROR_STOP on
begin;
select set_config('app.at_activation_company', :'target_company', true);
do $$
declare company uuid := current_setting('app.at_activation_company')::uuid;
 config public.document_sequences;
begin
 if not exists(select 1 from public.companies where id=company) then
  raise exception 'Unknown target company';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(company::text||':asset-transfer-number',0));
 select * into config from public.document_sequences
 where company_id=company and document_type='asset_transfer' for update;
 if found and (config.prefix<>'AT' or config.padding<>3 or config.reset_frequency::text<>'never' or config.deleted_at is not null) then
  raise exception 'Existing transfer sequence requires separate compatibility review';
 end if;
 if exists(select 1 from public.document_sequence_periods where company_id=company and document_type='asset_transfer' and period_start<>date '1970-01-01') then
  raise exception 'Periodic transfer counters require separate continuation review';
 end if;
 insert into public.document_sequences(company_id,document_type,prefix,padding,reset_frequency,status)
 values(company,'asset_transfer','AT',3,'never','active')
 on conflict(company_id,document_type) do update set status='active',updated_at=now();
 -- Keep every existing counter/number. Allocation skips occupied legacy references.
 insert into public.asset_transfer_numbering_activation(company_id,enabled) values(company,true)
 on conflict(company_id) do update set enabled=true;
end $$;
commit;
