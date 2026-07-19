# Pilot Data Reconciliation

Run these checks after preview/import and before pilot acceptance. The SQL is read-only and matches the current schema; review it before running against the intended project. It must not be used to update, delete, or repair data.

## Supplier checks

- Supplier codes are present, stable, and unique among non-deleted records.
- Required pilot suppliers are active and their names/contact details match the source list.
- Duplicate names are reviewed manually because names are not the stable key.
- Compare total and active/inactive counts to the approved source file.

```sql
select supplier_code, count(*) as row_count
from public.suppliers
where deleted_at is null
group by supplier_code
having supplier_code is null or btrim(supplier_code) = '' or count(*) > 1
order by supplier_code;

select status, count(*) as row_count
from public.suppliers
where deleted_at is null
group by status
order by status;

select lower(btrim(name)) as normalized_name,
       lower(btrim(coalesce(email, ''))) as normalized_email,
       regexp_replace(coalesce(phone, ''), '[^0-9]+', '', 'g') as normalized_phone,
       count(*) as row_count
from public.suppliers
where deleted_at is null
group by 1, 2, 3
having count(*) > 1
order by row_count desc, normalized_name;
```

## Item and supplier-item checks

- Item codes are present and unique; required names, categories, and base/purchase UOMs are correct.
- Supplier-item rows point to the intended active supplier and item.
- Unit cost, conversion, MOQ, and lead time match the approved source.
- Compare categories and UOMs to the approved catalogue; review negative thresholds/costs and missing supplier resolution.

```sql
select item_code, count(*) as row_count
from public.items
where deleted_at is null
group by item_code
having btrim(item_code) = '' or count(*) > 1
order by item_code;

select s.supplier_code, i.item_code, si.purchase_uom,
       si.conversion_to_base_uom, si.unit_cost, si.moq,
       si.lead_time_days, si.status
from public.supplier_items si
join public.suppliers s on s.id = si.supplier_id
join public.items i on i.id = si.item_id
where si.deleted_at is null
order by s.supplier_code, i.item_code;

select category, base_unit, purchase_unit, count(*) as row_count
from public.items
where deleted_at is null
group by category, base_unit, purchase_unit
order by category, base_unit, purchase_unit;

select item_code, safety_stock, cost, lead_time_days, moq
from public.items
where deleted_at is null
  and (safety_stock < 0 or cost < 0 or lead_time_days < 0 or moq < 0)
order by item_code;

select si.id, s.supplier_code, i.item_code
from public.supplier_items si
left join public.suppliers s on s.id = si.supplier_id and s.deleted_at is null
left join public.items i on i.id = si.item_id and i.deleted_at is null
where si.deleted_at is null and (s.id is null or i.id is null);
```

## Opening-stock checks

- Every opening import is a posted `opening_balance` transaction with `reference_type = 'opening_stock_import'`.
- Branch and item match the expected pilot list.
- Header and line quantities/costs agree; there is at most one opening transaction per branch/item.
- Current balances are explained by all posted ledger movement, not only the opening rows.
- Compare imported row count, branch quantity, and inventory value to the approved opening-stock source.
- Review negative stock, positive stock with zero cost, and missing UOM conversions as explicit exceptions.

```sql
select b.branch_code, i.item_code,
       count(*) as opening_rows,
       sum(st.quantity_in - st.quantity_out) as header_quantity,
       sum(coalesce(st.total_cost, 0)) as header_cost
from public.stock_transactions st
join public.branches b on b.id = st.branch_id
join public.items i on i.id = st.item_id
where st.transaction_type = 'opening_balance'
  and st.reference_type = 'opening_stock_import'
group by b.branch_code, i.item_code
order by b.branch_code, i.item_code;

select st.transaction_no,
       st.quantity_in - st.quantity_out as header_quantity,
       coalesce(sum(stl.quantity_in - stl.quantity_out), 0) as line_quantity
from public.stock_transactions st
left join public.stock_transaction_lines stl
  on stl.stock_transaction_id = st.id
where st.reference_type = 'opening_stock_import'
group by st.id, st.transaction_no, st.quantity_in, st.quantity_out
having st.quantity_in - st.quantity_out <>
       coalesce(sum(stl.quantity_in - stl.quantity_out), 0)
order by st.transaction_no;

select sb.branch_name, sb.item_code,
       sb.current_stock, sb.average_cost, sb.inventory_value
from public.stock_balances_view sb
where sb.current_stock < 0
   or (sb.current_stock > 0 and sb.average_cost = 0)
order by sb.branch_name, sb.item_code;

select sb.branch_id, sb.item_id, sum(sb.current_stock) as current_stock,
       coalesce(sum(sl.quantity_in - sl.quantity_out), 0) as ledger_quantity
from public.stock_balances_view sb
left join public.stock_ledger_view sl
  on sl.item_id = sb.item_id
 and sl.branch_id is not distinct from sb.branch_id
group by sb.branch_id, sb.item_id
having sum(sb.current_stock) <>
       coalesce(sum(sl.quantity_in - sl.quantity_out), 0);

select uc.item_id, uc.from_uom, uc.to_uom, uc.factor, uc.status
from public.uom_conversions uc
where uc.deleted_at is null
  and (uc.factor <= 0 or btrim(uc.from_uom) = '' or btrim(uc.to_uom) = '')
order by uc.item_id, uc.from_uom, uc.to_uom;
```

An empty result from the duplicate/mismatch queries is expected. Record row counts and exceptions; correct source data through an approved application workflow rather than ad hoc SQL.
