-- Keep the bounded inventory read tenant-safe while avoiding repeated RLS
-- policy evaluation for every row in the already-scoped result set. The
-- function itself still applies can_access_inventory_branch() to every branch
-- before returning data; only the duplicate underlying-table policy checks are
-- bypassed by SECURITY DEFINER.

alter function public.get_stock_card_bounded(date, date, uuid, uuid, text, text, text, text)
  security definer;

comment on function public.get_stock_card_bounded(date, date, uuid, uuid, text, text, text, text)
  is 'Tenant-scoped bounded inventory read; explicit branch authorization is evaluated inside the function.';

notify pgrst, 'reload schema';
