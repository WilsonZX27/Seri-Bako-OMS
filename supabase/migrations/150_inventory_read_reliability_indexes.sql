-- Inventory read reliability hardening.
--
-- Supabase logs showed repeated 57014 timeouts while the bounded stock-card
-- functions were calculating opening balances. The previous composite index
-- started with item_id, which is useful for a single-item lookup but prevents
-- the common all-items/date-range read from narrowing on transaction_date.
-- These indexes keep the existing security and running-balance semantics while
-- making the date-bounded read path selective for both list and report views.

create index if not exists stock_transactions_posted_date_branch_item_created_idx
  on public.stock_transactions(status, transaction_date, branch_id, item_id, created_at, id)
  where status = 'posted';

create index if not exists stock_transaction_lines_transaction_item_branch_idx
  on public.stock_transaction_lines(stock_transaction_id, item_id, branch_id);

create index if not exists stock_counts_posted_date_branch_idx
  on public.stock_counts(status, count_date, branch_id, id)
  where status = 'posted' and deleted_at is null;

create index if not exists stock_count_lines_count_variance_idx
  on public.stock_count_lines(stock_count_id, variance_percent, variance_qty, item_id);

