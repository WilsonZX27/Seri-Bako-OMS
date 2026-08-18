import { isMockMode, mockItems, mockSupplierItems, mockSuppliers, mockUomConversions } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { compareTableValues } from "@/lib/table-state";
import type { Database } from "@/types/database";

type Filters = Record<string, string | undefined>;

function statusFilter(value?: string) {
  return value && value !== "all" ? value : null;
}

function filterAndSort<T extends Record<string, unknown>>(rows: T[], filters: Filters, keys: (keyof T)[]) {
  const search = filters.search?.trim().toLowerCase();
  const status = statusFilter(filters.status);
  const sort = filters.sort ?? String(keys[0] ?? "created_at");
  const dir = filters.dir === "desc" ? "desc" : "asc";
  return rows
    .filter((row) => {
      const matchesSearch = search ? keys.some((key) => String(row[key] ?? "").toLowerCase().includes(search)) : true;
      const matchesStatus = status ? row.status === status : true;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => compareTableValues(a[sort], b[sort], dir));
}

export async function getSupplierItems(filters: Filters = {}) {
  if (isMockMode()) {
    const rows = mockSupplierItems.map((row) => {
      const supplier = mockSuppliers.find((supplierRow) => supplierRow.id === row.supplier_id);
      const item = mockItems.find((itemRow) => itemRow.id === row.item_id);
      return {
        ...row,
        supplier_name: supplier?.name ?? "-",
        item_code: item?.item_code ?? "-",
        item_name: item?.item_name ?? "-",
        base_unit: item?.base_unit ?? "-",
      };
    });
    return filterAndSort(rows, filters, ["supplier_name", "supplier_item_code", "supplier_item_name", "item_code", "item_name", "purchase_uom"]);
  }

  const supabase = await createClient();
  const [{ data, error }, { data: suppliers, error: suppliersError }, { data: items, error: itemsError }] = await Promise.all([
    supabase
    .from("supplier_items")
    .select("*")
    .is("deleted_at", null)
    .order("supplier_item_name", { ascending: true }),
    supabase.from("suppliers").select("id, name"),
    supabase.from("items").select("id, item_code, item_name, base_unit"),
  ]);
  if (error) throw new Error(error.message);
  if (suppliersError) throw new Error(suppliersError.message);
  if (itemsError) throw new Error(itemsError.message);
  const supplierById = new Map((suppliers ?? []).map((supplier) => [supplier.id, supplier]));
  const itemById = new Map((items ?? []).map((item) => [item.id, item]));
  const rows = ((data ?? []) as Database["public"]["Tables"]["supplier_items"]["Row"][]).map((row) => ({
    ...row,
    supplier_name: supplierById.get(row.supplier_id)?.name ?? "-",
    item_code: itemById.get(row.item_id)?.item_code ?? "-",
    item_name: itemById.get(row.item_id)?.item_name ?? "-",
    base_unit: itemById.get(row.item_id)?.base_unit ?? "-",
  }));
  return filterAndSort(rows, filters, ["supplier_name", "supplier_item_code", "supplier_item_name", "item_code", "item_name", "purchase_uom"]);
}

export async function getSupplierItem(id: string) {
  if (isMockMode()) {
    const row = mockSupplierItems.find((item) => item.id === id);
    if (!row) throw new Error("Mock supplier item not found");
    return row;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("supplier_items").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getUomConversions(filters: Filters = {}) {
  if (isMockMode()) {
    return filterAndSort(mockUomConversions, filters, ["from_uom", "to_uom", "factor"]);
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("uom_conversions").select("*").is("deleted_at", null).order("from_uom", { ascending: true });
  if (error) throw new Error(error.message);
  return filterAndSort(data ?? [], filters, ["from_uom", "to_uom", "factor"]);
}

export async function getUomConversion(id: string) {
  if (isMockMode()) {
    const row = mockUomConversions.find((item) => item.id === id);
    if (!row) throw new Error("Mock UOM conversion not found");
    return row;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("uom_conversions").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

export type ItemSourcingReadiness = {
  status: "master_only" | "supplier_ready" | "branch_ready";
  supplierItems: Array<Pick<Database["public"]["Tables"]["supplier_items"]["Row"], "id" | "supplier_id" | "supplier_item_code" | "purchase_uom" | "unit_cost"> & { supplier_name: string }>;
  branchMappings: Array<Pick<Database["public"]["Tables"]["branch_supplier_items"]["Row"], "id" | "branch_id" | "supplier_item_id" | "is_preferred"> & { branch_name: string; branch_code: string }>;
};

/** Read-only sourcing summary for the item workspace. */
export async function getItemSourcingReadiness(itemId: string): Promise<ItemSourcingReadiness> {
  if (isMockMode()) return { status: "master_only", supplierItems: [], branchMappings: [] };

  const supabase = await createClient();
  const [{ data: supplierItems, error: supplierItemsError }, { data: branchMappings, error: branchMappingsError }] = await Promise.all([
    supabase.from("supplier_items").select("id, supplier_id, supplier_item_code, purchase_uom, unit_cost").eq("item_id", itemId).eq("status", "active").is("deleted_at", null).order("created_at", { ascending: false }).limit(50),
    supabase.from("branch_supplier_items").select("id, branch_id, supplier_item_id, is_preferred").eq("item_id", itemId).eq("status", "active").is("deleted_at", null).limit(200),
  ]);
  if (supplierItemsError) throw new Error(supplierItemsError.message);
  if (branchMappingsError) throw new Error(branchMappingsError.message);

  const supplierRows = supplierItems ?? [];
  const mappingRows = branchMappings ?? [];
  const supplierIds = [...new Set(supplierRows.map((row) => row.supplier_id))];
  const branchIds = [...new Set(mappingRows.map((row) => row.branch_id))];
  const [{ data: suppliers, error: suppliersError }, { data: branches, error: branchesError }] = await Promise.all([
    supplierIds.length ? supabase.from("suppliers").select("id, name").in("id", supplierIds) : Promise.resolve({ data: [], error: null }),
    branchIds.length ? supabase.from("branches").select("id, branch_code, branch_name").in("id", branchIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (suppliersError) throw new Error(suppliersError.message);
  if (branchesError) throw new Error(branchesError.message);

  const supplierById = new Map((suppliers ?? []).map((row) => [row.id, row.name]));
  const branchById = new Map((branches ?? []).map((row) => [row.id, row]));
  const supplierItemById = new Map(supplierRows.map((row) => [row.id, row]));
  const resolvedSupplierItems = supplierRows.filter((row) => supplierById.has(row.supplier_id)).map((row) => ({ ...row, supplier_name: supplierById.get(row.supplier_id) ?? "Unknown supplier" }));
  const resolvedBranchMappings = mappingRows.map((row) => {
    const branch = branchById.get(row.branch_id);
    const supplierItem = supplierItemById.get(row.supplier_item_id);
    return branch && supplierItem ? { ...row, branch_name: branch.branch_name, branch_code: branch.branch_code } : null;
  }).filter((row): row is NonNullable<typeof row> => Boolean(row));

  return {
    status: resolvedBranchMappings.length ? "branch_ready" : resolvedSupplierItems.length ? "supplier_ready" : "master_only",
    supplierItems: resolvedSupplierItems,
    branchMappings: resolvedBranchMappings,
  };
}
