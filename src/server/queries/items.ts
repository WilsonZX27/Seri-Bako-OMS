import { createClient } from "@/lib/supabase/server";
import { isMockMode, mockItems, mockSuppliers } from "@/lib/mock-mode";
import { compareTableValues, paginateRows } from "@/lib/table-state";
import { getStockBalances } from "@/server/queries/inventory";

type ItemFilters = {
  search?: string;
  status?: string;
  category?: string;
  supplier?: string;
  stock_control?: string;
  low_stock?: string;
  sort?: string;
  dir?: string;
  page?: string;
};

function filterItems<
  T extends {
    id?: string;
    item_code: string;
    autocount_code: string | null;
    item_name: string;
    category: string;
    supplier_id?: string | null;
    supplier_name?: string | null;
    safety_stock?: number;
    current_stock?: number;
    barcode?: string | null;
    internal_barcode?: string | null;
    supplier_barcode?: string | null;
    status: string;
  },
>(items: T[], filters: ItemFilters) {
  const search = filters.search?.trim().toLowerCase();
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  const category = filters.category && filters.category !== "all" ? filters.category : null;
  const supplier = filters.supplier && filters.supplier !== "all" ? filters.supplier : null;
  const sort = filters.sort ?? "item_name";
  const dir = filters.dir === "desc" ? "desc" : "asc";

  return items.filter((item) => {
    const matchesSearch = search
      ? [item.item_code, item.autocount_code ?? "", item.item_name, item.category, item.supplier_name ?? "", item.barcode ?? "", item.internal_barcode ?? "", item.supplier_barcode ?? ""].some((value) =>
          value.toLowerCase().includes(search),
        )
      : true;
    const matchesStatus = status ? item.status === status : true;
    const matchesCategory = category ? item.category === category : true;
    const matchesSupplier = supplier ? item.supplier_id === supplier : true;
    const matchesStockControl =
      filters.stock_control === "with_safety_stock" ? Number(item.safety_stock ?? 0) > 0 :
      filters.stock_control === "without_safety_stock" ? Number(item.safety_stock ?? 0) === 0 : true;
    const isLowStock = Number(item.current_stock ?? 0) < Number(item.safety_stock ?? 0);
    const matchesLowStock = filters.low_stock === "yes" ? isLowStock : filters.low_stock === "no" ? !isLowStock : true;
    return matchesSearch && matchesStatus && matchesCategory && matchesSupplier && matchesStockControl && matchesLowStock;
  }).sort((a, b) => compareTableValues(a[sort as keyof T], b[sort as keyof T], dir));
}

export async function getItems(filters: ItemFilters = {}) {
  if (isMockMode()) {
    const supplierById = new Map(mockSuppliers.map((supplier) => [supplier.id, supplier]));
    return filterItems(mockItems.map((item) => ({
      ...item,
      supplier_name: item.supplier_id ? supplierById.get(item.supplier_id)?.name ?? null : null,
    })), filters);
  }

  const supabase = await createClient();
  const [{ data: items, error: itemsError }, { data: suppliers, error: suppliersError }] = await Promise.all([
    supabase.from("items").select("*").order("item_name", { ascending: true }),
    supabase.from("suppliers").select("id, name"),
  ]);

  if (itemsError) throw new Error(itemsError.message);
  if (suppliersError) throw new Error(suppliersError.message);

  const supplierById = new Map((suppliers ?? []).map((supplier) => [supplier.id, supplier]));
  return filterItems((items ?? []).map((item) => ({
    ...item,
    supplier_name: item.supplier_id ? supplierById.get(item.supplier_id)?.name ?? null : null,
  })), filters);
}

export async function getItemsWithStock(filters: ItemFilters = {}) {
  const balances = await getStockBalances();
  const itemDetails = isMockMode() ? mockItems : await getItems();
  const itemById = new Map(itemDetails.map((item) => [item.id, item]));
  return filterItems(
    balances.map((item) => ({
      ...itemById.get(item.item_id),
      id: item.item_id,
      item_code: item.item_code,
      autocount_code: item.autocount_code,
      item_name: item.item_name,
      category: item.category,
      base_unit: item.base_unit,
      supplier_name: item.supplier_name,
      supplier_id: item.supplier_id,
      cost: item.cost,
      safety_stock: item.safety_stock,
      current_stock: item.current_stock,
      status: item.status,
      barcode: itemById.get(item.item_id)?.barcode ?? null,
      internal_barcode: itemById.get(item.item_id)?.internal_barcode ?? null,
      supplier_barcode: itemById.get(item.item_id)?.supplier_barcode ?? null,
      item_image_url: itemById.get(item.item_id)?.item_image_url ?? null,
    })),
    filters,
  );
}

export async function getItemsWithStockPage(filters: ItemFilters = {}) {
  const rows = await getItemsWithStock(filters);
  return paginateRows(rows, filters.page);
}

export async function getItem(id: string) {
  if (isMockMode()) {
    const item = mockItems.find((row) => row.id === id);
    if (!item) throw new Error("Mock item not found");
    return item;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("items").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}
