-- The workspace pending-action query filters this enum state on every page.
-- A general (status, updated_at) index was not selected under the existing RLS
-- plan. This partial index avoids scanning non-actionable historical records.
-- It changes neither row visibility nor workflow state.
create index if not exists outlet_daily_ready_updated_idx
  on public.outlet_daily_records (updated_at desc)
  where status = 'evening_completed';
