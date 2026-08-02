-- Cancelled unposted work is historical/audit data, not active work.
-- Older cancellation migrations recorded the terminal status before they
-- started setting deleted_at. Backfill the visibility marker without deleting
-- rows or touching posted/ledger-impacting records.

update public.goods_receivings
set deleted_at = coalesce(deleted_at, updated_at, now())
where status = 'cancelled'
  and deleted_at is null;

update public.purchase_returns
set deleted_at = coalesce(deleted_at, updated_at, now())
where status = 'cancelled'
  and deleted_at is null;

update public.production_jobs
set deleted_at = coalesce(deleted_at, updated_at, now())
where status = 'cancelled'
  and deleted_at is null;

update public.stock_transfers
set deleted_at = coalesce(deleted_at, updated_at, now())
where status = 'cancelled'
  and deleted_at is null;

update public.stock_wastage
set deleted_at = coalesce(deleted_at, updated_at, now())
where status = 'cancelled'
  and deleted_at is null;

update public.stock_counts
set deleted_at = coalesce(deleted_at, updated_at, now())
where status = 'cancelled'
  and deleted_at is null;

update public.purchase_requests
set deleted_at = coalesce(deleted_at, updated_at, now())
where status = 'cancelled'
  and deleted_at is null;

update public.purchase_orders
set deleted_at = coalesce(deleted_at, updated_at, now())
where status = 'cancelled'
  and deleted_at is null;
