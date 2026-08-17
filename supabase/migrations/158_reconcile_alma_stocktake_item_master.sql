-- Reconcile the 2026-08-16 Alma Central Kitchen stock take into the item master.
-- Stock-take item codes/names are canonical for the active master. Existing
-- ledger rows remain attached to their item IDs; legacy duplicate identities
-- are archived rather than hard-deleted. Existing UOM values are preserved.
begin;

create temporary table alma_stocktake (
  item_code text not null,
  item_name text not null,
  category text not null,
  stock_uom text not null
) on commit drop;

insert into alma_stocktake (item_code, item_name, category, stock_uom)
values
('99SPEEDM00001', 'BUTTERITE BUTTER 250G', '99SPEEDM', 'KG'),
  ('CARELIFE00001', 'ORGANIC BLACK SESAME 2KG PACK', 'CARELIFE', 'KG'),
  ('CHINA00001', '洲星马蹄粉 WATER CHESNUT STARCH 500GM', 'CHINA', 'KG'),
  ('CHYINING00046', 'ALUMINIUM ROLL', 'CHYI NING', 'ROLL'),
  ('CHYINING00006', 'BABAS MUNG BEAN FLOUR 500GM', 'CHYI NING', 'KG'),
  ('CHYINING00023', 'BAKING POWDER 500G/PACK (2PACK)', 'CHYI NING', 'KG'),
  ('CHYINING00042', 'BARLEY', 'CHYI NING', 'KG'),
  ('CHYINING00039', 'CAP 3 GAJAH GLUTINOUS RICE FLOUR', 'CHYI NING', 'KG'),
  ('CHYINING00038', 'CAP KAPAL ABC TAPIOCA STARCH', 'CHYI NING', 'KG'),
  ('CHYINING00001', 'CAP SAUH ALL PURPOSE FLOUR 1KG', 'CHYI NING', 'KG'),
  ('CHYINING00024', 'CHEK HUP SUGAR CANE ROCK SUGAR 250G/PACK', 'CHYI NING', 'KG'),
  ('CHYINING00051', 'CHINESE PARSLEY THAILAND', 'CHYI NING', 'KG'),
  ('CHYINING00037', 'CSR BROWN SUGAR PRAI', 'CHYI NING', 'KG'),
  ('TEOWJOO00001', 'DING SHANG AIR ABU', 'CHYI NING', 'KG'),
  ('CHYINING00041', 'DOVE HIGH RATIO WHEAT FLOUR 25KG', 'CHYI NING', 'KG'),
  ('TEOWJOO00011', 'ELEPHANT THICK CARAMEL SAUCE 740ML', 'CHYI NING', 'KG'),
  ('CILANTRO00010', 'FOOD GRADE CLING WRAP 18INCHS', 'CHYI NING', 'ROLL'),
  ('CHYINING00020', 'MINCED CHICKEN (1KG X 10PKT)', 'CHYI NING', 'KG'),
  ('CHYINING00007', 'GARLIC', 'CHYI NING', 'KG'),
  ('CHYINING00009', 'GHEE HIANG SESAME OIL 680ML', 'CHYI NING', 'KG'),
  ('CHYINING00011', 'GINGER OLD', 'CHYI NING', 'KG'),
  ('CHYINING00002', 'JASMINE SUPER BERAS IMPORT 10KG', 'CHYI NING', 'KG'),
  ('CHYINING00053', 'JASMINE SUPER BERAS PULUT (NYONYA) 1KG', 'CHYI NING', 'KG'),
  ('CHYINING00032', 'KARA COCONUT MILK / SANTAN 1 LITRE', 'CHYI NING', 'LITRE'),
  ('CILANTRO00016', 'KNIFE OIL 3KG', 'CILANTRO', 'KG'),
  ('CHYINING00027', 'KNOR CHICKEN STOCK 1KG', 'CHYI NING', 'KG'),
  ('CHYINING00028', 'LADY CHOICES PEANUT BUTTER HALUS 3KG', 'CHYI NING', 'KG'),
  ('CHYINING00005', 'LAMSOON SHORTENING 16KG', 'CHYI NING', 'KG'),
  ('CHYINING00018', 'LKK PLUM SAUCE (260G X 12)', 'CHYI NING', 'KG'),
  ('TEOWJOO00043', 'LEE KUM KEE VEGETARIAN OYSTER SAUCE', 'CHYI NING', 'KG'),
  ('CHYINING00034', 'LEMON', 'CHYI NING', 'NOS'),
  ('CHYINING00013', 'LIFE TOMATO KETCHUP 1KG', 'CHYI NING', 'KG'),
  ('CHYINING00044', 'LP SAUCE 290ML', 'CHYI NING', 'KG'),
  ('CHYINING00054', 'MSM BROWN SUGAR PRAI 500G/PACK', 'CHYI NING', 'KG'),
  ('CHYINING00049', 'NATUREL SUNFLOWER OIL 3L/BOTOL', 'CHYI NING', 'KG'),
  ('CHYINING00043', 'NESCAFE CLASSIC REFILL PACK 550G', 'CHYI NING', 'KG'),
  ('CHYINING00012', 'ORANGE NOS', 'CHYI NING', 'NOS'),
  ('TEOWJOO00031', 'P1 GULA PRAI MSM 50KG 1 BAG', 'CHYI NING', 'KG'),
  ('CHYINING00015', 'PAPRIKA POWDER 500GM', 'CHYI NING', 'KG'),
  ('CHYINING00047', 'Parchment Paper/ Baking Paper 450mm x 100mm', 'CHYI NING', 'ROLL'),
  ('CHYINING00016', 'PEACE BLACK PEPPER POWDER 500G', 'CHYI NING', 'KG'),
  ('CHYINING00004', 'PEACE BRAND FINE SALT 500GM', 'CHYI NING', 'KG'),
  ('CHYINING00035', 'KITCHEN TOWEL', 'CHYI NING', 'ROLL'),
  ('HONGYAP00045', 'PEACE BRAND SEA COCONUT CAN', 'CHYI NING', 'CAN'),
  ('CILANTRO00009', 'PEACE BRAND WHITE PEPPER POWDER 500G/PACK', 'CHYI NING', 'KG'),
  ('CHYINING00055', 'QIANYING SEAWEED SLICED 100GM', 'CHYI NING', 'PACK'),
  ('CHYINING00025', 'ROASTED PEANUT CRUSHED 500G/PACK', 'CHYI NING', 'KG'),
  ('CHYINING00033', 'SALTE PURE SEA SALT', 'CHYI NING', 'PACK'),
  ('CHYINING00014', 'SELESTANE DIJON MUSTARD 1KG', 'CHYI NING', 'TUB'),
  ('CHYINING00008', 'SHALLOT', 'CHYI NING', 'KG'),
  ('TEOWJOO00036', 'SICHUAN ZHA CAI 四川榨菜 3KG', 'CHYI NING', 'KG'),
  ('CHYINING00030', 'STAR WHEAT STARCH', 'CHYI NING', 'KG'),
  ('CHYINING00031', 'TIANJIN RED BEAN 10KG', 'CHYI NING', 'KG'),
  ('CHYINING00040', 'WHITE SESAME', 'CHYI NING', 'KG'),
  ('CHYINING00010', 'YELLOW ONION', 'CHYI NING', 'KG'),
  ('CILANTRO00006', 'Black Rubbish Bag 36 x 48', 'CILANTRO', 'PACK'),
  ('CILANTRO00018', 'LEE KUM KEE LIGHT SOY SAUCE', 'CILANTRO', 'KG'),
  ('FINEFOOD00003', 'ISIGNY UNSALTED BUTTER 1KG', 'FINEFOOD', 'KG'),
  ('FINEFOOD00005', 'ISIGNY A.O.P SALTED BUTTER 250GM', 'FINEFOOD', 'KG'),
  ('FINEFOOD00004', 'ISIGNY A.O.P UNSALTED BUTTER 250GM', 'FINEFOOD', 'KG'),
  ('HONGYAP00018', 'ALMOND NUTS 1KG', 'HONGYAP', 'KG'),
  ('HONGYAP00019', 'ALMOND POWDER 1KG', 'HONGYAP', 'KG'),
  ('HONGYAP00009', 'ANCHOR MOZARELLA CHEESE 2KG/PACK', 'HONGYAP', 'KG'),
  ('HONGYAP00035', 'ANCHOR SALTED BUTTER 5KG', 'HONGYAP', 'KG'),
  ('HONGYAP00002', 'ANCHOR UHT FULL CREAM MILK LITRE', 'HONGYAP', 'LITRE'),
  ('HONGYAP00010', 'ANCHOR UHT WHIPPING CREAM LITRE', 'HONGYAP', 'LITRE'),
  ('HONGYAP00001', 'ANCHOR UNSALTED BUTTER', 'HONGYAP', 'KG'),
  ('HONGYAP00017', 'BREAD FLOUR - GUNUNG MAS 25KG', 'HONGYAP', 'KG'),
  ('HONGYAP00021', 'CANDIA 82% FAT UNSALTED BUTTER 260GM', 'HONGYAP', 'KG'),
  ('HONGYAP00024', 'DESICATED COCONUT 1KG', 'HONGYAP', 'KG'),
  ('HONGYAP00036', 'DISPOSABLE Pipping Bag (M)', 'HONGYAP', 'PACK'),
  ('HONGYAP00007', 'DRIED CRANBERRY 1KG', 'HONGYAP', 'KG'),
  ('HONGYAP00016', 'GOLDEN HORSE HIGH PROTEIN FLOUR 25KG', 'HONGYAP', 'KG'),
  ('HONGYAP00013', 'LAPED SNOW POWDER 1KG', 'HONGYAP', 'KG'),
  ('HONGYAP00047', 'PHILADELPHIA CREAM CHEESE 2KG', 'HONGYAP', 'KG'),
  ('HONGYAP00005', 'PISTACHIO NUT 1KG', 'HONGYAP', 'KG'),
  ('HONGYAP00006', 'PURPLE SWEET POTATO POWDER KG', 'HONGYAP', 'KG'),
  ('HONGYAP00015', 'SAF INSTANT YEAST - GOLD 500GM', 'HONGYAP', 'KG'),
  ('HONGYAP00030', 'SHREDDED PASRLEY 500GM', 'HONGYAP', 'KG'),
  ('HONGYAP00022', 'SUNNY CHICKEN FLOSS KG', 'HONGYAP', 'KG'),
  ('HONGYAP00032', 'VALRHONA CHOCOLATE POWDER KG', 'HONGYAP', 'KG'),
  ('HONGYAP00012', 'VALRHONA GUANAJA BUTTONS 70% CHOCOLATE 3KG PACK', 'HONGYAP', 'KG'),
  ('HONGYAP00031', 'VALUE PRIDE TOPPING CREAM KG', 'HONGYAP', 'KG'),
  ('HONGYAP00033', 'VANHOUTEN WHITE COMPOUND COIN KG', 'HONGYAP', 'KG'),
  ('HONGYAP00014', 'WHEAT GLUTEN FLOUR KG', 'HONGYAP', 'KG'),
  ('KIHOLE00001', 'THAILAND RICE (OLD) 50KG', 'KIHOLE', 'KG'),
  ('KIHOLE00002', 'THAILAND RICE (NEW) 50KG', 'KIHOLE', 'KG'),
  ('LAZADA00001', 'QUEEN NATURAL ALMOND EXTRACT (50g/btl)', 'LAZADA', 'KG'),
  ('LOTUS00004', 'ARO FROZEN STRAWBERRY 1KG', 'LOTUS', 'KG'),
  ('LOTUS00005', 'KIMBALL TOMATO PUREE CAN', 'LOTUS', 'KG'),
  ('OIYIN00006', 'CHINESE ALMOND 南杏 3KG', 'OIYIN', 'KG'),
  ('OIYIN00019', 'CRYSANTHENUM 桐乡 朵菊 JU HUA KG', 'OIYIN', 'KG'),
  ('OIYIN00011', 'DRIED HAWTHORN 靓 山楂片 SHAN ZHA 1KG', 'OIYIN', 'KG'),
  ('OIYIN00014', 'DRIED LONGAN 1KG', 'OIYIN', 'KG'),
  ('OIYIN00013', 'DRIED ROSE 1KG', 'OIYIN', 'KG'),
  ('OIYIN00010', 'DRIED SCALLOP 中 干贝 GAN BEI 1KG', 'OIYIN', 'KG'),
  ('OIYIN00012', 'DRIED SUGAR CANE 庄竹蔗干 ZHU ZHE GAN 1KG', 'OIYIN', 'KG'),
  ('OIYIN00018', 'GOJI BERRY 60头 枸杞 QI ZI 1k', 'OIYIN', 'KG'),
  ('OIYIN00016', 'LALANG GRASS 白茅根 MAO GEN 1KG', 'OIYIN', 'KG'),
  ('OIYIN00008', 'LICORICE ROOT 大丙 甘草片 GAN CAO 1KG', 'OIYIN', 'KG'),
  ('OIYIN00007', 'MUSHROOM - 仿木白花菇 DONG GU 1KG', 'OIYIN', 'KG'),
  ('OIYIN00015', 'ORANGE SKIN 1KG', 'OIYIN', 'KG'),
  ('OIYIN00004', 'OSMANTHUS 6A 桂花 GUI HUA KG', 'OIYIN', 'KG'),
  ('OIYIN00002', 'RED DATES 大 红枣片 HONG ZAO 7.5KG', 'OIYIN', 'KG'),
  ('OIYIN00009', 'ROSELLE 特洛神花 (26) LUO SHEN HUA 1KG', 'OIYIN', 'KG'),
  ('PASAR00003', 'FIVE SPICY POWDER', 'PASAR', 'KG'),
  ('FOODAY00001', 'MASCORN WHILE KERNEL CORN (2KG PER PACK)', 'FOODAY', 'KG'),
  ('ONICOLD00006', 'PXX GULA PASIR MSM 50KG 1 BAG', 'ONICOLD', 'KG'),
  ('PAHANG00001', 'MUSANG KING DURIAN PASTE (2KG PER PACK)', 'PAHANG', 'KG'),
  ('PASAR00001', 'NUTMEG KG', 'PASAR', 'KG'),
  ('PASAR00002', 'PANDAN LEAVES KG', 'PASAR', 'KG'),
  ('PCS-EGG00001', 'CHICKEN - EGG (A SIZE) NOS', 'PCS-EGG', 'PCS'),
  ('SHOPEE00001', 'BRUGGEMAN INSTANT YEAST 500GM', 'SHOPEE', 'KG'),
  ('SHOPEE00002', 'FRENCH ROSE FLOWER PETALS 100GM', 'SHOPEE', 'KG'),
  ('SHOPEE00003', 'SMALL BAGS DEOXIDANT 30CC PKT', 'SHOPEE', 'PCS'),
  ('SUPREME00001', 'HAYATI BESTARI MERAH 5A -S1 5% 10KG', 'SUPREME', 'KG'),
  ('TANGHK00004', 'PURPLE SWEET POTATO KG', 'TANGHK', 'KG'),
  ('TANGHK00003', 'TARO 芋头 YAM KG', 'TANGHK', 'KG'),
  ('TANGHK00005', 'WATER CHESTNUT KG', 'TANGHK', 'KG'),
  ('TANGHK00002', 'WHITE RADISH 白萝卜 KG', 'TANGHK', 'KG'),
  ('TEOWJOO00063', 'BIRD''S CUSTARD POWDER KG', 'TEOWJOO', 'KG'),
  ('TEOWJOO00005', 'CAP 3 GAJAH BLENDED RICE FLOUR KG', 'TEOWJOO', 'KG'),
  ('TEOWJOO00007', 'CAP BINTANG CORN FLOUR KG', 'TEOWJOO', 'KG'),
  ('TEOWJOO00016', 'CHEK HUP GULA KUNDUR (CANDIED MELON)', 'TEOWJOO', 'KG'),
  ('TEOWJOO00008', 'CREAM CORN MAKMUR 425G X 24', 'TEOWJOO', 'CAN'),
  ('TEOWJOO00022', 'HAPPY GRASS KONNYAKU POWDER', 'TEOWJOO', 'KG'),
  ('TEOWJOO00028', 'M.SHROOMS MALTOSE', 'TEOWJOO', 'KG'),
  ('TEOWJOO00029', 'MERMAID AGAR AGAR POWDER', 'TEOWJOO', 'KG'),
  ('TEOWJOO00018', 'MSM ICING SUGAR 40KG/BAG', 'TEOWJOO', 'KG'),
  ('TEOWJOO00027', 'PEACE KING LYCHEE CAN', 'TEOWJOO', 'CAN'),
  ('YINONNBM00001', 'CASSIA SEED', 'YINONNBM', 'KG'),
  ('YOONGHEN00001', '140 DRIED SHRIMP', 'YOONGHEN', 'KG'),
  ('YOONGHEN00002', '80 DRIED SHRIMP', 'YOONGHEN', 'KG'),
  ('9', 'cone dessert box (round) 200PCS', 'GOLDEN FRUITS INFORMATION TECH.', 'PACK'),
  ('10', 'cone dessert box (inner) 230PCS', 'GOLDEN FRUITS INFORMATION TECH.', 'PACK'),
  ('11', 'cone dessert box (outer) 300PCS', 'GOLDEN FRUITS INFORMATION TECH.', 'PACK'),
  ('12', 'small toast box 900PCS', 'GOLDEN FRUITS INFORMATION TECH.', 'PACK'),
  ('13', 'small kuih box 1000PCS', 'GOLDEN FRUITS INFORMATION TECH.', 'PACK'),
  ('14', 'seri bako carry bag 1250pcs', 'GOLDEN FRUITS INFORMATION TECH.', 'PACK'),
  ('15', 'handcarry magnetic box (1250PCS)', 'GOLDEN FRUITS INFORMATION TECH.', 'PACK'),
  ('16', 'big toast box 600pcs', 'GOLDEN FRUITS INFORMATION TECH.', 'PACK'),
  ('17', 'magnetic box 40pcs', 'GOLDEN FRUITS INFORMATION TECH.', 'PACK'),
  ('1', 'Wife Cake Box', 'GREAT POINT', 'PACK'),
  ('2', 'Almond Cookies Box', 'GREAT POINT', 'PACK'),
  ('3', 'Egg Roll Box', 'GREAT POINT', 'PACK'),
  ('20', 'APET TRAY (CLEAR) 1CTN*10PKT*100PCS', 'GUAN SENG HENG', 'CTN'),
  ('21', 'LUNCHEON NAPKIN 1CTN*30PKT*100PCS', 'GUAN SENG HENG', 'CTN'),
  ('5', 'Plastic Tray', 'GUAN SHENG HENG', 'PACK'),
  ('6', 'Nitrile Glove', 'GUAN SHENG HENG', 'PACK'),
  ('7', 'Plastic Glove 1CTN 100BOX', 'GUAN SHENG HENG', 'PACK'),
  ('18', 'kwan kee plastic', 'GUAN SHENG HENG', 'PACK');

create temporary table alma_identity_map (
  old_code text primary key,
  canonical_code text not null
) on commit drop;

insert into alma_identity_map (old_code, canonical_code)
values
  ('CILANTRO00008', 'CHYINING00023'),
  ('TEOWJOO00015', 'CHYINING00039'),
  ('TEOWJOO00041', 'CHYINING00038'),
  ('CILANTRO00002', 'CHYINING00032'),
  ('IFM00001', 'CHYINING00034'),
  ('CILANTRO00005', 'CHYINING00047'),
  ('PPGSHSB00002', 'CHYINING00035'),
  ('ORIENTAL00057', 'CHYINING00040'),
  ('ONICOLD00005', 'CILANTRO00018'),
  ('FROMPNG00011', 'HONGYAP00001');

do $$
declare
  target_company_id uuid;
begin
  -- Scope the reconciliation to the company that owns the named Alma CK
  -- branch; never guess by company creation order in a multi-tenant database.
  select company_id into target_company_id
  from public.branches
  where branch_name = 'CK @ ALMA'
    and status = 'active'
    and deleted_at is null
  order by created_at asc
  limit 1;
  if target_company_id is null then
    raise exception 'Cannot reconcile Alma stock take: active CK @ ALMA branch was not found.';
  end if;

  -- When a stock-take code is new but the same item is already present under
  -- one of the known legacy codes, move the existing row so its ledger history
  -- follows the canonical stock-take identity.
  update public.items legacy
  set item_code = stocktake.item_code,
      item_name = stocktake.item_name,
      category = stocktake.category,
      updated_at = now()
  from alma_stocktake stocktake
  join alma_identity_map identity_map
    on identity_map.canonical_code = stocktake.item_code
   and identity_map.old_code = legacy.item_code
  where legacy.company_id = target_company_id
    and not exists (
      select 1 from public.items occupied
      where occupied.company_id = target_company_id
        and occupied.item_code = stocktake.item_code
        and occupied.id <> legacy.id
    );

  -- If both codes already exist, keep the stock-take code as the active
  -- identity and archive only the legacy duplicate. Historical movements stay
  -- readable through the archived item row.
  update public.items legacy
  set status = 'archived',
      deleted_at = coalesce(legacy.deleted_at, now()),
      updated_at = now()
  from alma_identity_map identity_map
  where legacy.company_id = target_company_id
    and identity_map.old_code = legacy.item_code
    and exists (
      select 1 from alma_stocktake stocktake
      where stocktake.item_code = identity_map.canonical_code
    )
    and not exists (
      select 1 from alma_stocktake stocktake
      where stocktake.item_code = legacy.item_code
    );

  -- Canonical stock-take names/categories win for every code in the file.
  update public.items item
  set item_name = stocktake.item_name,
      category = stocktake.category,
      status = 'active',
      deleted_at = null,
      updated_at = now()
  from alma_stocktake stocktake
  where item.company_id = target_company_id
    and item.item_code = stocktake.item_code;

  -- Add stock-take items that are genuinely new. UOM is required for a new
  -- item, so use the stock-take value only on insert; existing UOM is untouched.
  insert into public.items (
    company_id, item_code, item_name, category, purchase_unit, base_unit,
    conversion_to_base_unit, supplier_id, cost, safety_stock, lead_time_days,
    moq, status
  )
  select
    target_company_id, stocktake.item_code, stocktake.item_name,
    stocktake.category, stocktake.stock_uom, stocktake.stock_uom,
    1, null, 0, 0, 0, 0, 'active'
  from alma_stocktake stocktake
  where not exists (
    select 1 from public.items item
    where item.company_id = target_company_id
      and item.item_code = stocktake.item_code
  );

  -- Supplier item display identity follows the canonical item master.
  update public.supplier_items supplier_item
  set supplier_item_code = item.item_code,
      supplier_item_name = item.item_name,
      updated_at = now()
  from public.items item
  where supplier_item.company_id = target_company_id
    and item.company_id = target_company_id
    and item.id = supplier_item.item_id;
end;
$$;

notify pgrst, 'reload schema';
commit;
