-- Candidate indexes matching queue reads observed in cumulative statistics.
-- Only the Purchase Request index is partial. Catalog verification confirms
-- installation, not planner selection or a measured latency improvement.
create index if not exists documents_approval_updated_idx
  on public.documents (approval_status, updated_at desc);

create index if not exists purchase_requests_status_updated_active_idx
  on public.purchase_requests (status, updated_at desc)
  where deleted_at is null;

create index if not exists notifications_created_idx
  on public.notifications (created_at desc);
