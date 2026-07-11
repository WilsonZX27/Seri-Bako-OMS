-- Sprint 7.2.21A: align stock transaction insert RLS with staff-role permissions.

drop policy if exists "Admin and kitchen can insert stock transactions" on public.stock_transactions;
drop policy if exists "stock transactions insert permission holders" on public.stock_transactions;

create policy "stock transactions insert permission holders" on public.stock_transactions
for insert to authenticated
with check (
  public.has_permission('stock_transactions.create')
  and exists (
    select 1
    from public.staffs s
    left join public.branches b on b.id = stock_transactions.branch_id
    where s.auth_user_id = auth.uid()
      and s.status = 'active'
      and (
        stock_transactions.branch_id is null
        or b.company_id = s.company_id
      )
      and (
        stock_transactions.branch_id is null
        or exists (
          select 1
          from public.staff_branches sb
          where sb.staff_id = s.id
            and sb.branch_id = stock_transactions.branch_id
            and sb.access_level in ('full', 'manage')
        )
        or exists (
          select 1
          from public.staff_roles sr
          join public.roles r on r.id = sr.role_id
          where sr.staff_id = s.id
            and r.status = 'active'
            and r.role_code in ('super_admin', 'admin', 'operations_admin')
            and (sr.effective_from is null or sr.effective_from <= current_date)
            and (sr.effective_to is null or sr.effective_to >= current_date)
        )
      )
  )
);
