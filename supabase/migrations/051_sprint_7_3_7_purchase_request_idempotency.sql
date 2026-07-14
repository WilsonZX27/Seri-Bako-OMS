-- A browser submission key maps retries to the same PR without changing legacy rows.
alter table public.purchase_requests add column if not exists idempotency_key uuid;

create unique index if not exists purchase_requests_idempotency_key_idx
  on public.purchase_requests (idempotency_key)
  where idempotency_key is not null;
