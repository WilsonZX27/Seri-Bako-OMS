-- Sprint 7.2.22: stock transaction audit writes use staffs.id.

alter table public.stock_transactions
  drop constraint if exists stock_transactions_created_by_fkey;

alter table public.stock_transactions
  add constraint stock_transactions_created_by_fkey
  foreign key (created_by) references public.staffs(id) on delete set null not valid;
