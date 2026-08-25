import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireDetailRow } from "@/server/queries/detail";
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
    brand_name?: string | null;
    category: string;
    supplier_id?: string | null;
    supplier_name?: string | null;
    safety_stock?: number;
    current_stock?: number;
    status: string;
    deleted_at?: string | null;
  },
>(items: T[], filters: ItemFilters) {
  const search = filters.search?.trim().toLowerCase();
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  const category = filters.category && filters.category !== "all" ? filters.category : null;
  const supplier = filters.supplier && filters.supplier !== "all" ? filters.supplier : null;
  const sort = filters.sort ?? "item_code";
  const dir = filters.dir === "desc" ? "desc" : "asc";

  return items.filter((item) => {
    const matchesSearch = search
      ? [item.item_code, item.autocount_code ?? "", item.item_name, item.brand_name ?? "", item.category, item.supplier_name ?? ""].some((value) =>
          value.toLowerCase().includes(search),
        )
      : true;
    const matchesStatus =
      status === "archived" ? Boolean(item.deleted_at) :
      status ? item.status === status :
      true;
    const matchesCategory = category ? item.category === category : true;
    const matchesSupplier = supplier ? item.supplier_id === supplier : true;
    const matchesStockControl =
      filters.stock_control === "with_safety_stock" ? Number(item.safety_stock ?? 0) > 0 :
      filters.stock_control === "without_safety_stock" ? Number(item.safety_stock ?? 0) === 0 : true;
    const isLowStock = Number(item.current_stock ?? 0) < Number(item.safety_stock ?? 0);
    const matchesLowStock = filters.low_stock === "yes" ? isLowStock : filters.low_stock === "no" ? !isLowStock : true;
    return matchesSearch && matchesStatus && matchesCategory && matchesSupplier && matchesStockControl && matchesLowStock;
  }).sort((a, b) => compareTableValues(a[sort as keyof T], b[sort as keyof T], dir)
    || compareTableValues(a.item_code, b.item_code, "asc")
    || compareTableValues(a.id, b.id, "asc"));
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
    (() => {
      let query = supabase.from("items").select("*").order("item_name", { ascending: true });
      if (filters.status === "archived") query = query.not("deleted_at", "is", null);
      else if (filters.status !== "all") query = query.is("deleted_at", null);
      return query;
    })(),
    supabase.from("suppliers").select("id, name"),
  ]);

  if (itemsError) throw new Error(itemsError.message);
  if (suppliersError) throw new Error(suppliersError.message);
  if (!items || !suppliers) throw new Error("Item master data returned no data.");

  const supplierById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
  return filterItems(items.map((item) => ({
    ...item,
    supplier_name: item.supplier_id ? supplierById.get(item.supplier_id)?.name ?? null : null,
  })), filters);
}

const getItemsWithStockBase = cache(async () => {
  const balances = await getStockBalances();
  const itemDetails = isMockMode() ? mockItems : await getItems();
  const balanceByItemId = new Map(balances.map((balance) => [balance.item_id, balance]));
  return itemDetails.map((item) => {
    const balance = balanceByItemId.get(item.id);
    return {
      ...item,
      ...balance,
      current_stock: balance?.current_stock ?? 0,
    };
  });
});

export async function getItemsWithStock(filters: ItemFilters = {}) {
  return filterItems(await getItemsWithStockBase(), filters);
}

export async function getItemsWithStockPage(filters: ItemFilters = {}) {
  if (!isMockMode()) {
    const supabase = await createClient();
    const page = Math.max(Number.parseInt(filters.page ?? "1", 10) || 1, 1);
    const { data, error } = await supabase.rpc("get_items_workspace", {
      p_search: filters.search?.trim() || null,
      p_status: filters.status ?? null,
      p_category: filters.category ?? null,
      p_supplier_id: filters.supplier && filters.supplier !== "all" ? filters.supplier : null,
      p_stock_control: filters.stock_control ?? null,
      p_low_stock: filters.low_stock ?? null,
      p_sort: filters.sort ?? "item_code",
      p_direction: filters.dir === "desc" ? "desc" : "asc",
      p_page: page,
      p_page_size: 15,
    });
    if (error && !["PGRST202", "42883"].includes(error.code ?? "")) throw new Error(error.message);

    if (!error) {
      type ItemRow = Awaited<ReturnType<typeof getItemsWithStock>>[number];
      type WorkspacePayload = {
        rows: ItemRow[];
        total_rows: number;
        page: number;
        page_size: number;
        summary: { total: number; active: number; inactive: number; archived: number; low_stock: number };
        categories: string[];
      };
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Items workspace returned no data.");
      const payload = data as unknown as WorkspacePayload;
      if (!Array.isArray(payload.rows) || payload.total_rows === null || payload.total_rows === undefined || !payload.summary || !Array.isArray(payload.categories)) {
        throw new Error("Items workspace returned an incomplete result.");
      }
      const totalRows = Number(payload.total_rows);
      const pageSize = Number(payload.page_size ?? 15);
      return {
        rows: payload.rows,
        totalRows,
        page: Number(payload.page ?? page),
        totalPages: Math.max(Math.ceil(totalRows / pageSize), 1),
        summary: payload.summary,
        categories: payload.categories,
      };
    }
  }

  const rows = await getItemsWithStock(filters);
  const paginated = paginateRows(rows, filters.page);
  return {
    ...paginated,
    summary: {
      total: rows.length,
      active: rows.filter((item) => item.status === "active" && !item.deleted_at).length,
      inactive: rows.filter((item) => item.status === "inactive" && !item.deleted_at).length,
      archived: rows.filter((item) => Boolean(item.deleted_at)).length,
      low_stock: rows.filter((item) => !item.deleted_at && Number(item.current_stock) < Number(item.safety_stock)).length,
    },
    categories: Array.from(new Set(rows.map((item) => item.category))).sort(),
  };
}

export async function getItem(id: string) {
  if (isMockMode()) {
    return requireDetailRow(mockItems.find((row) => row.id === id), "Item", id);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("items").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return requireDetailRow(data, "Item", id);
}
