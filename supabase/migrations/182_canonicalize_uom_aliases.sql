-- Canonicalize legacy supplier/document UOM aliases without changing quantities,
-- prices, or conversion factors. BTL and BOTTLE are the same unit in OMS;
-- BOTTLE is the operator-facing canonical value.

update public.items
set purchase_unit = 'BOTTLE'
where upper(trim(purchase_unit)) = 'BTL';

update public.items
set base_unit = 'BOTTLE'
where upper(trim(base_unit)) = 'BTL';

update public.supplier_items
set purchase_uom = 'BOTTLE'
where upper(trim(purchase_uom)) = 'BTL';

update public.purchase_request_lines
set uom = 'BOTTLE'
where upper(trim(uom)) = 'BTL';

update public.purchase_order_lines
set uom = 'BOTTLE'
where upper(trim(uom)) = 'BTL';

update public.goods_receiving_lines
set uom = 'BOTTLE'
where upper(trim(uom)) = 'BTL';

update public.purchase_return_lines
set uom = 'BOTTLE'
where upper(trim(uom)) = 'BTL';

update public.stock_count_lines
set uom = 'BOTTLE'
where upper(trim(uom)) = 'BTL';

update public.stock_transfer_lines
set uom = 'BOTTLE'
where upper(trim(uom)) = 'BTL';

update public.stock_wastage_lines
set uom = 'BOTTLE'
where upper(trim(uom)) = 'BTL';
