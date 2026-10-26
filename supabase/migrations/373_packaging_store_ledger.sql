-- Pending, no activation or seed/business writes. Packaging products are not ingredient stock.
create table public.packaging_stores(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),name text not null check(length(trim(name)) between 1 and 120),created_at timestamptz not null default now(),unique(company_id,name));
create table public.packaging_store_balances(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),store_id uuid not null references public.packaging_stores(id),product_id uuid not null references public.products(id),quantity numeric(16,2) not null check(quantity>=0),version bigint not null default 1,created_at timestamptz not null default now(),unique(store_id,product_id));
create table public.packaging_store_movements(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),store_id uuid not null references public.packaging_stores(id),product_id uuid not null references public.products(id),kind text not null check(kind in ('receipt','issue','count')),quantity numeric(16,2) not null,delta numeric(16,2) not null,balance_after numeric(16,2) not null check(balance_after>=0),reason text not null check(length(trim(reason)) between 1 and 1000),created_by uuid not null references public.staffs(id),created_at timestamptz not null default now(),client_key uuid not null,unique(company_id,client_key));
alter table public.packaging_stores enable row level security;
alter table public.packaging_store_balances enable row level security;
alter table public.packaging_store_movements enable row level security;
revoke all on public.packaging_stores,public.packaging_store_balances,public.packaging_store_movements from anon,authenticated;

create or replace function public.create_packaging_store(p_name text) returns uuid
language plpgsql security definer set search_path=public as $$
declare actor public.staffs; target uuid;
begin
 select * into actor from public.staffs where auth_user_id=auth.uid() and company_id=public.current_staff_company_id() and status='active' and deleted_at is null and (employment_end_date is null or employment_end_date >= (now() at time zone 'Asia/Kuala_Lumpur')::date);
 if actor.id is null or not ('super_admin'=any(public.current_staff_role_codes())) then raise exception 'Owner access required.';end if;
 if p_name is null or length(trim(p_name)) not between 1 and 120 then raise exception 'Enter a store name.';end if;
 insert into public.packaging_stores(company_id,name) values(actor.company_id,trim(p_name)) on conflict(company_id,name) do update set name=excluded.name returning id into target;return target;
end $$;

create or replace function public.post_packaging_store_movement(p_store uuid,p_product uuid,p_kind text,p_quantity numeric,p_reason text,p_expected_version bigint,p_client_key uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare actor public.staffs; prior public.packaging_store_movements; balance public.packaging_store_balances; next_qty numeric; movement uuid;
begin
 select * into actor from public.staffs where auth_user_id=auth.uid() and company_id=public.current_staff_company_id() and status='active' and deleted_at is null and (employment_end_date is null or employment_end_date >= (now() at time zone 'Asia/Kuala_Lumpur')::date);
 if actor.id is null or not ('super_admin'=any(public.current_staff_role_codes())) then raise exception 'Owner access required.';end if;
 if p_client_key is null or p_quantity is null or p_quantity<0 or p_quantity>9999999999 or p_quantity<>round(p_quantity,2) or p_reason is null or length(trim(p_reason)) not between 1 and 1000 or p_kind not in ('receipt','issue','count') or p_kind is null or (p_kind<>'count' and p_quantity=0) then raise exception 'Enter a valid quantity, movement and reason.';end if;
 perform 1 from public.packaging_stores where id=p_store and company_id=actor.company_id for update;
 if not found then raise exception 'Store unavailable.';end if;
 perform 1 from public.products where id=p_product and company_id=actor.company_id and lower(trim(category))='packaging' and deleted_at is null;
 if not found then raise exception 'Packaging product unavailable.';end if;
 select * into prior from public.packaging_store_movements where company_id=actor.company_id and client_key=p_client_key;
 if prior.id is not null then
  if prior.store_id<>p_store or prior.product_id<>p_product or prior.kind<>p_kind or prior.quantity<>p_quantity or prior.reason<>trim(p_reason) then raise exception 'Request key already used for different values.';end if;return prior.id;
 end if;
 select * into balance from public.packaging_store_balances where store_id=p_store and product_id=p_product and company_id=actor.company_id for update;
 if p_expected_version is null or p_expected_version<>coalesce(balance.version,0) then raise exception 'Balance changed. Review the latest balance before submitting.';end if;
 -- Unknown opening balance must be explicitly counted before receipt/issue.
 if balance.version is null and p_kind<>'count' then raise exception 'Count the opening balance first.';end if;
 next_qty:=case p_kind when 'count' then p_quantity when 'receipt' then balance.quantity+p_quantity else balance.quantity-p_quantity end;
 if next_qty<0 then raise exception 'Insufficient packaging balance.';end if;
 insert into public.packaging_store_balances(company_id,store_id,product_id,quantity,version) values(actor.company_id,p_store,p_product,next_qty,coalesce(balance.version,0)+1) on conflict(store_id,product_id) do update set quantity=excluded.quantity,version=excluded.version;
 insert into public.packaging_store_movements(company_id,store_id,product_id,kind,quantity,delta,balance_after,reason,created_by,client_key) values(actor.company_id,p_store,p_product,p_kind,p_quantity,next_qty-coalesce(balance.quantity,0),next_qty,trim(p_reason),actor.id,p_client_key) returning id into movement;return movement;
end $$;

create or replace function public.get_packaging_store_workspace() returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare tenant uuid:=public.current_staff_company_id();
begin
 if tenant is null or not exists(select 1 from public.staffs where auth_user_id=auth.uid() and company_id=tenant and status='active' and deleted_at is null and (employment_end_date is null or employment_end_date >= (now() at time zone 'Asia/Kuala_Lumpur')::date)) or not ('super_admin'=any(public.current_staff_role_codes())) then raise exception 'Owner access required.';end if;
 return jsonb_build_object('stores',coalesce((select jsonb_agg(s order by name) from (select id,name from public.packaging_stores where company_id=tenant) s),'[]'::jsonb),'products',coalesce((select jsonb_agg(p order by product_name) from (select id,product_name,selling_unit from public.products where company_id=tenant and lower(trim(category))='packaging' and deleted_at is null) p),'[]'::jsonb),'balances',coalesce((select jsonb_agg(b) from public.packaging_store_balances b where b.company_id=tenant),'[]'::jsonb),'movements',coalesce((select jsonb_agg(m) from (select * from public.packaging_store_movements where company_id=tenant order by created_at desc,id desc limit 50) m),'[]'::jsonb));
end $$;
revoke all on function public.create_packaging_store(text),public.post_packaging_store_movement(uuid,uuid,text,numeric,text,bigint,uuid),public.get_packaging_store_workspace() from public,anon;
grant execute on function public.create_packaging_store(text),public.post_packaging_store_movement(uuid,uuid,text,numeric,text,bigint,uuid),public.get_packaging_store_workspace() to authenticated;
