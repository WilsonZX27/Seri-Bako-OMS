-- Constant-size Supplier Invoice queue summary.
-- Reuses AP Aging's payment-ledger authority without constructing row, bucket,
-- supplier-exposure, or attention payloads for the queue side rail.

create or replace function public.get_supplier_invoice_queue_summary()
returns table(open_count bigint, paid_count bigint, balance numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor public.staffs%rowtype;
begin
  select * into actor
  from public.staffs
  where auth_user_id = auth.uid()
    and status = 'active'
    and deleted_at is null
  limit 1;

  if actor.id is null or not public.has_permission('supplier_invoice.view') then
    raise exception 'You do not have permission to view supplier invoice summaries.';
  end if;

  return query
  with payment_totals as (
    select
      payment.supplier_invoice_id,
      round(coalesce(sum(payment.amount), 0), 2) as amount_paid
    from public.supplier_invoice_payments payment
    where payment.company_id = actor.company_id
    group by payment.supplier_invoice_id
  ), scoped_invoices as (
    select
      invoice.status,
      greatest(round(invoice.total_amount - coalesce(payment.amount_paid, 0), 2), 0) as outstanding
    from public.supplier_invoices invoice
    left join payment_totals payment on payment.supplier_invoice_id = invoice.id
    where invoice.company_id = actor.company_id
      and invoice.deleted_at is null
  )
  select
    count(*) filter (
      where status in ('open', 'partially_paid') and outstanding > 0
    )::bigint,
    count(*) filter (where status = 'paid')::bigint,
    coalesce(
      round(sum(outstanding) filter (
        where status in ('open', 'partially_paid') and outstanding > 0
      ), 2),
      0
    )::numeric
  from scoped_invoices;
end;
$$;

revoke all on function public.get_supplier_invoice_queue_summary() from public, anon;
grant execute on function public.get_supplier_invoice_queue_summary() to authenticated;

notify pgrst, 'reload schema';

