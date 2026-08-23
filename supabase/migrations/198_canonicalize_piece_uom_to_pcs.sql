-- PIECE and PCS describe the same count unit. PCS is the OMS canonical value.
update public.products
set selling_unit = 'PCS', updated_at = now()
where upper(trim(selling_unit)) in ('PIECE', 'PIECES');

update public.product_packaging
set selling_uom = 'PCS', updated_at = now()
where upper(trim(selling_uom)) in ('PIECE', 'PIECES');

update public.recipes
set yield_unit = 'PCS', updated_at = now()
where upper(trim(yield_unit)) in ('PIECE', 'PIECES');
