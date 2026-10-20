alter table public.products
  add column if not exists is_seasonal boolean not null default false;

update public.products
set is_seasonal = true,
    updated_at = now()
where company_id = '3b104582-f8cb-4a4d-867f-b99e5ffc6486'
  and product_code in ('BB08', 'BB09', 'MC01', 'MC02', 'MC03', 'MC04', 'MC05', 'MC06', 'SRR04')
  and is_seasonal = false;
