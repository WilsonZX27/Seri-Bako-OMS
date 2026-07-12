alter table if exists public.purchase_orders
  add column if not exists branch_id uuid references public.branches(id) on delete restrict;

create index if not exists purchase_orders_branch_idx
  on public.purchase_orders(branch_id);

update public.purchase_orders po
set branch_id = pr.branch_id
from public.purchase_requests pr
where po.purchase_request_id = pr.id
  and po.branch_id is null
  and pr.branch_id is not null;
