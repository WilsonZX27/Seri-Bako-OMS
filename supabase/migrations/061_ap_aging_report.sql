-- Sprint 7.9.0: company-scoped, read-only AP aging report.

create index if not exists supplier_invoices_ap_aging_idx
  on public.supplier_invoices(company_id, status, due_date, supplier_id)
  where deleted_at is null;

create or replace function public.get_ap_aging_report(
  p_search text default null,
  p_supplier_id uuid default null,
  p_bucket text default null,
  p_status text default null,
  p_due_from date default null,
  p_due_to date default null,
  p_overdue_only boolean default false,
  p_page integer default 1,
  p_page_size integer default 20
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.staffs%rowtype;
  report_date date := (now() at time zone 'Asia/Kuala_Lumpur')::date;
  result jsonb;
begin
  select * into actor from public.staffs
  where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('supplier_invoice.view') then
    raise exception 'You do not have permission to view AP aging.';
  end if;

  p_page := greatest(coalesce(p_page, 1), 1);
  p_page_size := least(greatest(coalesce(p_page_size, 20), 1), 10000);

  with payment_totals as (
    select supplier_invoice_id, round(coalesce(sum(amount), 0), 2) amount_paid
    from public.supplier_invoice_payments
    where company_id=actor.company_id
    group by supplier_invoice_id
  ), base as (
    select si.id, si.invoice_no, si.supplier_invoice_no, si.supplier_id, s.name supplier_name,
      si.invoice_date, si.due_date, si.status, 'MYR'::text currency,
      round(si.total_amount, 2) original_total,
      round(coalesce(pt.amount_paid, 0), 2) amount_paid,
      greatest(round(si.total_amount-coalesce(pt.amount_paid, 0), 2), 0) outstanding,
      case when si.due_date is null then 0 else greatest(report_date-si.due_date, 0) end days_overdue,
      case
        when si.due_date is null then 'missing_due_date'
        when si.due_date > report_date then 'not_due'
        when si.due_date = report_date then 'due_today'
        when report_date-si.due_date between 1 and 30 then 'overdue_1_30'
        when report_date-si.due_date between 31 and 60 then 'overdue_31_60'
        when report_date-si.due_date between 61 and 90 then 'overdue_61_90'
        else 'overdue_90_plus'
      end aging_bucket
    from public.supplier_invoices si
    join public.suppliers s on s.id=si.supplier_id and s.company_id=actor.company_id
    left join payment_totals pt on pt.supplier_invoice_id=si.id
    where si.company_id=actor.company_id and si.deleted_at is null
      and si.status in ('open','partially_paid')
      and greatest(round(si.total_amount-coalesce(pt.amount_paid, 0), 2), 0) > 0
  ), filtered as (
    select * from base b where
      (nullif(trim(coalesce(p_search,'')),'') is null or concat_ws(' ',b.invoice_no,b.supplier_invoice_no,b.supplier_name) ilike '%'||trim(p_search)||'%')
      and (p_supplier_id is null or b.supplier_id=p_supplier_id)
      and (nullif(p_bucket,'') is null or p_bucket='all' or b.aging_bucket=p_bucket)
      and (nullif(p_status,'') is null or p_status='all' or b.status=p_status)
      and (p_due_from is null or b.due_date>=p_due_from)
      and (p_due_to is null or b.due_date<=p_due_to)
      and (not p_overdue_only or b.days_overdue>0)
  ), page_rows as (
    select * from filtered order by days_overdue desc, due_date asc nulls last, outstanding desc, invoice_no
    limit p_page_size offset (p_page-1)*p_page_size
  )
  select jsonb_build_object(
    'report_date', report_date,
    'timezone', 'Asia/Kuala_Lumpur',
    'currency', 'MYR',
    'page', p_page,
    'page_size', p_page_size,
    'total_rows', (select count(*) from filtered),
    'rows', coalesce((select jsonb_agg(to_jsonb(r) order by r.days_overdue desc, r.due_date asc nulls last, r.outstanding desc, r.invoice_no) from page_rows r), '[]'::jsonb),
    'summary', jsonb_build_object(
      'total_outstanding', coalesce((select round(sum(outstanding),2) from base),0),
      'total_overdue', coalesce((select round(sum(outstanding),2) from base where days_overdue>0),0),
      'due_today', coalesce((select round(sum(outstanding),2) from base where aging_bucket='due_today'),0),
      'due_next_7_days', coalesce((select round(sum(outstanding),2) from base where due_date>report_date and due_date<=report_date+7),0),
      'overdue_90_plus', coalesce((select round(sum(outstanding),2) from base where aging_bucket='overdue_90_plus'),0),
      'supplier_count', (select count(distinct supplier_id) from base),
      'oldest_overdue_invoice', (select invoice_no from base where days_overdue>0 order by days_overdue desc, due_date limit 1),
      'highest_exposure_supplier', (select supplier_name from base group by supplier_id,supplier_name order by sum(outstanding) desc limit 1)
    ),
    'buckets', coalesce((select jsonb_object_agg(aging_bucket, jsonb_build_object('invoice_count',invoice_count,'outstanding',outstanding)) from (
      select aging_bucket,count(*) invoice_count,round(sum(outstanding),2) outstanding from base group by aging_bucket
    ) x), '{}'::jsonb),
    'suppliers', coalesce((select jsonb_agg(to_jsonb(x) order by overdue_outstanding desc,total_outstanding desc) from (
      select supplier_id,supplier_name,count(*) invoice_count,round(sum(outstanding),2) total_outstanding,
        coalesce(round(sum(outstanding) filter(where days_overdue>0),2),0) overdue_outstanding,min(due_date) oldest_due_date,max(days_overdue) maximum_days_overdue
      from base group by supplier_id,supplier_name
    ) x), '[]'::jsonb)
  ) into result;
  return result;
end $$;

revoke all on function public.get_ap_aging_report(text,uuid,text,text,date,date,boolean,integer,integer) from public;
grant execute on function public.get_ap_aging_report(text,uuid,text,text,date,date,boolean,integer,integer) to authenticated;

notify pgrst, 'reload schema';
