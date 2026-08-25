\set ON_ERROR_STOP on

do $$
begin
  if current_setting('seri_bako.production_like_clone', true) is distinct from 'confirmed' then
    raise exception 'Production-like clone sanitisation requires an explicit local-session guard.';
  end if;
end
$$;

create or replace function pg_temp.uat_scrub_jsonb(value jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare result jsonb;
begin
  if value is null then return null; end if;
  case jsonb_typeof(value)
    when 'object' then
      select coalesce(jsonb_object_agg(
        key,
        case
          when key ~* '(password|token|secret|cookie|authorization|email|phone|avatar|file_?url|storage_?path|signed_?url)'
            then '"[redacted]"'::jsonb
          else pg_temp.uat_scrub_jsonb(child)
        end
      ), '{}'::jsonb) into result
      from jsonb_each(value) as entry(key, child);
      return result;
    when 'array' then
      select coalesce(jsonb_agg(pg_temp.uat_scrub_jsonb(child)), '[]'::jsonb) into result
      from jsonb_array_elements(value) as entry(child);
      return result;
    when 'string' then
      if value #>> '{}' ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}' then return '"[redacted]"'::jsonb; end if;
      return value;
    else
      return value;
  end case;
end
$$;

with pseudonyms as (
  select id,
    'UAT-' || upper(substr(replace(id::text, '-', ''), 1, 12)) as staff_code,
    'UAT Staff ' || lpad(row_number() over (order by company_id, created_at, id)::text, 4, '0') as full_name,
    'uat.' || replace(id::text, '-', '') || '@example.test' as email
  from public.staffs
)
update public.staffs staff
set auth_user_id = null,
    staff_code = pseudonyms.staff_code,
    full_name = pseudonyms.full_name,
    email = pseudonyms.email,
    invite_email = null,
    phone = null,
    avatar_url = null,
    avatar_path = null,
    must_change_password = false,
    auth_setup_method = null,
    temp_password_issued_at = null
from pseudonyms
where pseudonyms.id = staff.id;

update public.attachments
set file_name = 'UAT attachment ' || substr(id::text, 1, 8),
    file_path = null,
    storage_path = null,
    file_url = null;

update public.autocount_import_files
set file_name = 'UAT import ' || substr(id::text, 1, 8) || '.xlsx';

update public.autocount_import_rows
set source_file = 'UAT import source';

update public.notifications
set recipient_user_id = null,
    actor_user_id = null;

update public.user_preferences set user_id = null;
update public.activity_logs set metadata = pg_temp.uat_scrub_jsonb(metadata) where metadata is not null;
update public.audit_logs
set old_data = pg_temp.uat_scrub_jsonb(old_data),
    new_data = pg_temp.uat_scrub_jsonb(new_data),
    old_values = pg_temp.uat_scrub_jsonb(old_values),
    new_values = pg_temp.uat_scrub_jsonb(new_values);
update public.document_line_revisions
set before_snapshot = pg_temp.uat_scrub_jsonb(before_snapshot),
    after_snapshot = pg_temp.uat_scrub_jsonb(after_snapshot);
update public.operation_requests set safe_result = pg_temp.uat_scrub_jsonb(safe_result) where safe_result is not null;
update public.system_incident_events set safe_metadata = pg_temp.uat_scrub_jsonb(safe_metadata) where safe_metadata is not null;
update public.draft_revisions set safe_payload = pg_temp.uat_scrub_jsonb(safe_payload);

truncate table public.stock_balances_summary, public.inventory_daily_summary;

do $$
declare pair record;
begin
  for pair in
    select distinct st.item_id, st.branch_id
    from public.stock_transactions st
    where st.status = 'posted' and st.item_id is not null and st.branch_id is not null
    union
    select distinct line.item_id, coalesce(line.branch_id, transaction.branch_id)
    from public.stock_transaction_lines line
    join public.stock_transactions transaction on transaction.id = line.stock_transaction_id
    where transaction.status = 'posted'
      and line.item_id is not null
      and coalesce(line.branch_id, transaction.branch_id) is not null
  loop
    perform public.refresh_stock_balances_summary(pair.item_id, pair.branch_id);
  end loop;
end
$$;

with movement_rows as (
  select transaction.item_id, transaction.branch_id, transaction.transaction_date,
    transaction.transaction_type::text as transaction_type, transaction.quantity_in, transaction.quantity_out
  from public.stock_transactions transaction
  where transaction.status = 'posted'
    and transaction.item_id is not null
    and transaction.branch_id is not null
    and not exists (select 1 from public.stock_transaction_lines line where line.stock_transaction_id = transaction.id)
  union all
  select line.item_id, coalesce(line.branch_id, transaction.branch_id), transaction.transaction_date,
    transaction.transaction_type::text, line.quantity_in, line.quantity_out
  from public.stock_transaction_lines line
  join public.stock_transactions transaction on transaction.id = line.stock_transaction_id
  where transaction.status = 'posted'
    and line.item_id is not null
    and coalesce(line.branch_id, transaction.branch_id) is not null
), grouped as (
  select branch.company_id, movement.branch_id, movement.item_id, movement.transaction_date, movement.transaction_type,
    coalesce(sum(movement.quantity_in), 0) as quantity_in,
    coalesce(sum(movement.quantity_out), 0) as quantity_out,
    count(*)::integer as movement_count
  from movement_rows movement
  join public.branches branch on branch.id = movement.branch_id
  group by branch.company_id, movement.branch_id, movement.item_id, movement.transaction_date, movement.transaction_type
)
insert into public.inventory_daily_summary (
  company_id, branch_id, item_id, transaction_date, transaction_type,
  quantity_in, quantity_out, movement_count, updated_at
)
select company_id, branch_id, item_id, transaction_date, transaction_type,
  quantity_in, quantity_out, movement_count, now()
from grouped;
