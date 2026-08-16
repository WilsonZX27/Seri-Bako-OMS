-- Give received quantities their own provenance instead of inferring it from
-- qty_sent_source. The prior inference made valid outlet receipts appear
-- unavailable whenever the Central Kitchen sent source was legacy/unverified.
--
-- qty_sent_estimated is populated by migration 145 only when the outlet
-- explicitly supplied a received value, including an explicit zero. Non-zero
-- legacy receipts are also safe to preserve as provided; legacy default zeros
-- remain fail-closed.

alter table public.outlet_daily_record_lines
  add column if not exists morning_received_provided boolean
  generated always as (
    qty_sent_estimated is not null or morning_received_qty <> 0
  ) stored;

create index if not exists outlet_daily_records_date_status_updated_idx
  on public.outlet_daily_records(record_date desc, status, updated_at desc, id);

create index if not exists outlet_daily_records_branch_date_status_updated_idx
  on public.outlet_daily_records(branch_id, record_date desc, status, updated_at desc, id);
