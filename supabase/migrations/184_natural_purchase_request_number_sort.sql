-- Natural Purchase Request number ordering before pagination.
-- Reuses the immutable natural_sort_key introduced by migration 183 so
-- PR/AUG26/9 sorts before PR/AUG26/10 in ascending order.

alter table public.purchase_requests
  add column if not exists request_sort_key text
  generated always as (public.natural_sort_key(request_no)) stored;

create index if not exists idx_purchase_requests_company_natural_number
  on public.purchase_requests (company_id, request_sort_key, id)
  where deleted_at is null;

comment on column public.purchase_requests.request_sort_key
is 'Generated operator-facing natural order key for request_no; never entered or edited directly.';
