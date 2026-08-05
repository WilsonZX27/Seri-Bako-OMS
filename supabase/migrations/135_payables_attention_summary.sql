-- Lightweight dashboard-only AP attention summary.
-- Keeps the same invoice, payment, timezone, and aging rules as get_ap_aging_report
-- without constructing paginated rows, supplier groups, or alert detail payloads.

create or replace function public.get_payables_attention_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.staffs%rowtype;
  report_date date := (now() at time zone 'Asia/Kuala_Lumpur')::date;
  result jsonb;
begin
  select * into actor
  from public.staffs
  where auth_user_id = auth.uid()
    and status = 'active'
    and deleted_at is null
  limit 1;

  if actor.id is null or not public.has_permission('supplier_invoice.view') then
    raise exception 'You do not have permission to view AP aging.';
  end if;

  with payment_totals as (
    select
      supplier_invoice_id,
      round(coalesce(sum(amount), 0), 2) as amount_paid
    from public.supplier_invoice_payments
    where company_id = actor.company_id
    group by supplier_invoice_id
  ), attention_rows as (
    select
      si.invoice_no,
      si.due_date,
      greatest(round(si.total_amount - coalesce(pt.amount_paid, 0), 2), 0) as outstanding,
      case
        when si.due_date is null then 'data_quality'
        when report_date - si.due_date > 90 then 'critical'
        when report_date - si.due_date > 0 then 'overdue'
        when si.due_date = report_date then 'due_today'
        when si.due_date <= report_date + 7 then 'due_soon'
      end as alert_severity
    from public.supplier_invoices si
    left join payment_totals pt on pt.supplier_invoice_id = si.id
    where si.company_id = actor.company_id
      and si.deleted_at is null
      and si.status in ('open', 'partially_paid')
      and greatest(round(si.total_amount - coalesce(pt.amount_paid, 0), 2), 0) > 0
  )
  select jsonb_build_object(
    'report_date', report_date,
    'timezone', 'Asia/Kuala_Lumpur',
    'total_attention_amount', coalesce(round(sum(outstanding), 2), 0),
    'critical_count', count(*) filter (where alert_severity = 'critical'),
    'critical_amount', coalesce(round(sum(outstanding) filter (where alert_severity = 'critical'), 2), 0),
    'overdue_count', count(*) filter (where due_date is not null and due_date < report_date),
    'overdue_amount', coalesce(round(sum(outstanding) filter (where due_date is not null and due_date < report_date), 2), 0),
    'due_today_count', count(*) filter (where alert_severity = 'due_today'),
    'due_today_amount', coalesce(round(sum(outstanding) filter (where alert_severity = 'due_today'), 2), 0),
    'due_next_7_count', count(*) filter (where alert_severity = 'due_soon'),
    'due_next_7_amount', coalesce(round(sum(outstanding) filter (where alert_severity = 'due_soon'), 2), 0),
    'missing_due_date_count', count(*) filter (where alert_severity = 'data_quality')
  ) into result
  from attention_rows;

  return result;
end;
$$;

revoke all on function public.get_payables_attention_summary() from public;
grant execute on function public.get_payables_attention_summary() to authenticated;
