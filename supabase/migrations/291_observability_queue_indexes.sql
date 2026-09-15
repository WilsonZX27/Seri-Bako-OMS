-- Match the remaining high-frequency queue reads reported by pg_stat_statements.
-- These partial indexes preserve every workflow and RLS rule while avoiding
-- sorting historical/deleted rows for the newest actionable records.
create index if not exists documents_approval_updated_idx
  on public.documents (approval_status, updated_at desc);

create index if not exists purchase_requests_status_updated_active_idx
  on public.purchase_requests (status, updated_at desc)
  where deleted_at is null;

create index if not exists notifications_created_idx
  on public.notifications (created_at desc);
