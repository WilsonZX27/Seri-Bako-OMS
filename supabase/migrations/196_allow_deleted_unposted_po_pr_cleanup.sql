-- Active and posted POs remain blocked by the hard-delete preview. When an
-- eligible PR is removed, retain its cancelled PO audit row without a dangling
-- foreign-key reference.
alter table public.purchase_orders
  drop constraint if exists purchase_orders_purchase_request_id_fkey;

alter table public.purchase_orders
  add constraint purchase_orders_purchase_request_id_fkey
  foreign key (purchase_request_id)
  references public.purchase_requests(id)
  on delete set null;
