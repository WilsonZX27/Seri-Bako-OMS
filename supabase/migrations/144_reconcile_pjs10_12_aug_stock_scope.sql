-- Reconcile CK-PJS10's 12 Aug 2026 physical-count scope.
-- Ten legacy item codes are renamed in place so their ledger history remains
-- attached to the same item UUID. Eleven genuinely missing items are created
-- at zero KG. The zero-balance read rows make all 127 physical-count items
-- available to the stock-count seed without inventing historical movements.

do $$
declare
  target_branch public.branches%rowtype;
  source_company_id uuid;
  mapping record;
  target_item_id uuid;
  reference_supplier_id uuid;
  reference_category text;
begin
  select * into target_branch
  from public.branches
  where branch_code = 'CK-PJS10'
    and status = 'active'
    and deleted_at is null
  limit 1;

  if target_branch.id is null then
    raise notice 'CK-PJS10 branch was not found; 12 Aug stock scope reconciliation was skipped.';
    return;
  end if;
  source_company_id := target_branch.company_id;

  create temporary table pjs10_12_aug_items (
    old_code text,
    item_code text not null,
    item_name text not null,
    supplier_prefix text not null
  ) on commit drop;

  insert into pjs10_12_aug_items (old_code, item_code, item_name, supplier_prefix) values
    ('BWYHOLDI00005', 'QUIKGROC00102', 'SHORTENING', 'QUIKGROC'),
    ('FROMPNG00007', 'ORIENTAL00117', 'BUTTERLITE', 'ORIENTAL'),
    ('FROMPNG00010', 'QUIKGROC00063', 'EMB MOZZARELLA SHREDDED CHEESE 200GM', 'QUIKGROC'),
    ('FROMPNG00013', 'QUIKGROC00052', 'BRUGGEMAN DRIED INSTANT YEAST', 'QUIKGROC'),
    ('ORIENTAL00010', 'QUIKGROC00046', 'BINTANG WHEAT STARCH 25KG', 'QUIKGROC'),
    ('ORIENTAL00031', 'QUIKGROC00017', 'WHITE RADISH', 'QUIKGROC'),
    ('ORIENTAL00048', 'QUIKGROC00099', 'KCS SWEET CORN 425G / CTN', 'QUIKGROC'),
    ('ORIENTAL00055', 'QUIKGROC00014', 'DRIED SCALLOP', 'QUIKGROC'),
    ('ORIENTAL00077', 'OIYIN00012', 'DRIED SUGAR CANE', 'OIYIN'),
    ('ORIENTAL00108', 'QUIKGROC00062', 'CREAM CHEESE', 'QUIKGROC'),
    (null, 'FROMPNG00005', 'DUSTING SUGAR', 'FROMPNG'),
    (null, 'OIYIN00006', 'NANXIN', 'OIYIN'),
    (null, 'ORIENTAL00014', 'PARCHMENT PAPER', 'ORIENTAL'),
    (null, 'ORIENTAL00072', 'DISH WASH', 'ORIENTAL'),
    (null, 'ORIENTAL00087', 'CANDIED MELON 250G / PACK', 'ORIENTAL'),
    (null, 'QUIKGROC00023', 'HIGH RATIO FLOUR 25KG', 'QUIKGROC'),
    (null, 'QUIKGROC00044', 'KNIFE OIL', 'QUIKGROC'),
    (null, 'QUIKGROC00090', 'EGG PLANT', 'QUIKGROC'),
    (null, 'QUIKGROC00091', 'CAPSICUM RED & YELLOW', 'QUIKGROC'),
    (null, 'QUIKGROC00107', 'DUCHEF TOMATO PUREE 220G', 'QUIKGROC'),
    (null, 'QUIKGROC00108', 'SHIITAKE MUSHROOM / FLOWER MUSHROOM', 'QUIKGROC');

  for mapping in select * from pjs10_12_aug_items loop
    target_item_id := null;
    reference_supplier_id := null;
    reference_category := null;

    select i.supplier_id, i.category
      into reference_supplier_id, reference_category
    from public.items i
    where i.company_id = source_company_id
      and i.deleted_at is null
      and i.item_code like mapping.supplier_prefix || '%'
      and i.supplier_id is not null
    order by i.item_code
    limit 1;

    reference_category := coalesce(nullif(reference_category, ''), 'RAW MATERIAL');

    select i.id into target_item_id
    from public.items i
    where i.company_id = source_company_id
      and i.item_code = mapping.item_code
      and i.deleted_at is null
    limit 1;

    if target_item_id is null and mapping.old_code is not null then
      select i.id into target_item_id
      from public.items i
      where i.company_id = source_company_id
        and i.item_code = mapping.old_code
        and i.deleted_at is null
      limit 1;
    end if;

    if target_item_id is null then
      insert into public.items (
        company_id, item_code, item_name, category, purchase_unit, base_unit,
        conversion_to_base_unit, supplier_id, cost, safety_stock, lead_time_days,
        moq, status
      ) values (
        source_company_id, mapping.item_code, mapping.item_name,
        reference_category, 'KG', 'KG', 1, reference_supplier_id,
        0, 0, 0, 0, 'active'
      ) returning id into target_item_id;
    else
      update public.items
      set item_code = mapping.item_code,
          item_name = mapping.item_name,
          purchase_unit = 'KG',
          base_unit = 'KG',
          conversion_to_base_unit = 1,
          supplier_id = coalesce(reference_supplier_id, supplier_id),
          status = 'active',
          deleted_at = null
      where id = target_item_id;
    end if;

    -- When the corrected code already existed in the item master, remove the
    -- legacy alias from this branch's read model. Ledger rows remain untouched.
    if mapping.old_code is not null then
      delete from public.stock_balances_summary summary
      using public.items legacy
      where summary.branch_id = target_branch.id
        and summary.item_id = legacy.id
        and legacy.company_id = source_company_id
        and legacy.item_code = mapping.old_code
        and legacy.id <> target_item_id;
    end if;

    insert into public.stock_balances_summary (
      item_id, branch_id, company_id, item_code, autocount_code, item_name,
      branch_name, category, purchase_unit, base_unit,
      conversion_to_base_unit, supplier_id, supplier_name, cost, safety_stock,
      lead_time_days, moq, status, total_quantity_in, total_quantity_out,
      current_stock, current_qty, average_cost, inventory_value, last_movement,
      is_low_stock, shortage_quantity, updated_at
    )
    select
      i.id, target_branch.id, source_company_id, i.item_code, i.autocount_code,
      i.item_name, target_branch.branch_name, i.category, 'KG', 'KG', 1,
      i.supplier_id, s.name, i.cost, i.safety_stock, i.lead_time_days, i.moq,
      i.status, 0, 0, 0, 0, 0, 0, null,
      i.safety_stock > 0, greatest(i.safety_stock, 0), now()
    from public.items i
    left join public.suppliers s on s.id = i.supplier_id
    where i.id = target_item_id
    on conflict (item_id, branch_id) do update set
      item_code = excluded.item_code,
      item_name = excluded.item_name,
      category = excluded.category,
      purchase_unit = excluded.purchase_unit,
      base_unit = excluded.base_unit,
      conversion_to_base_unit = excluded.conversion_to_base_unit,
      supplier_id = excluded.supplier_id,
      supplier_name = excluded.supplier_name,
      status = excluded.status,
      updated_at = now();
  end loop;
end
$$;
