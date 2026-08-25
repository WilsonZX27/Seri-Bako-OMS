import { createClient } from "@/lib/supabase/server";
import { requireDetailRow } from "@/server/queries/detail";
import { isMockMode, mockSuppliers } from "@/lib/mock-mode";
import { compareTableValues, paginateRows } from "@/lib/table-state";
import type { SupplierStatus } from "@/types/database";

type SupplierFilters = {
  search?: string;
  status?: string;
  sort?: string;
  dir?: string;
  page?: string;
};

const PAGE_SIZE = 15;

function normalizeSupplierSearch(value: string | undefined) {
  return value
    ?.trim()
    .slice(0, 80)
    .replace(/[(),\\%_"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function filterSuppliers<T extends { supplier_code: string | null; name: string; contact_person: string | null; phone: string | null; email: string | null; status: string; deleted_at?: string | null }>(
  suppliers: T[],
  filters: SupplierFilters,
) {
  const search = filters.search?.trim().toLowerCase();
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  const sort = filters.sort ?? "name";
  const dir = filters.dir === "desc" ? "desc" : "asc";

  return suppliers.filter((supplier) => {
    if (supplier.deleted_at) return false;
    const matchesSearch = search
      ? [supplier.supplier_code ?? "", supplier.name, supplier.contact_person ?? "", supplier.phone ?? "", supplier.email ?? ""].some((value) =>
          value.toLowerCase().includes(search),
        )
      : true;
    const effectiveStatus = status === "archived" ? "inactive" : status;
    const matchesStatus = effectiveStatus ? supplier.status === effectiveStatus : true;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => compareTableValues(a[sort as keyof T], b[sort as keyof T], dir));
}

function isSupplierStatus(value: string): value is SupplierStatus {
  return value === "active" || value === "inactive";
}

export async function getSuppliers(filters: SupplierFilters = {}) {
  if (isMockMode()) {
    return paginateRows(filterSuppliers(mockSuppliers, filters), filters.page, PAGE_SIZE);
  }

  const supabase = await createClient();
  const requestedPage = Math.max(Number(filters.page) || 1, 1);
  // supplier_group is a display-only projection during the migration window;
  // keep server ordering on columns present before migration 174 as well.
  const allowedSorts = ["supplier_code", "name", "contact_person", "phone", "email", "payment_terms_days", "status"];
  const sort = filters.sort && allowedSorts.includes(filters.sort) ? filters.sort : "name";
  let query = supabase.from("suppliers").select("*", { count: "exact" }).is("deleted_at", null);

  const requestedStatus = filters.status === "archived" ? "inactive" : filters.status;
  if (requestedStatus && isSupplierStatus(requestedStatus)) {
    query = query.eq("status", requestedStatus);
  }

  const search = normalizeSupplierSearch(filters.search);
  if (search) {
    query = query.or(`supplier_code.ilike.%${search}%,name.ilike.%${search}%,contact_person.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error, count } = await query
    .order(sort, { ascending: filters.dir !== "desc" })
    .range((requestedPage - 1) * PAGE_SIZE, requestedPage * PAGE_SIZE - 1);
  if (error) throw new Error(error.message);
  if (!data || count === null) throw new Error("Supplier list returned no data.");
  const totalRows = count;
  return {
    rows: data,
    page: requestedPage,
    pageSize: PAGE_SIZE,
    totalRows,
    totalPages: Math.max(Math.ceil(totalRows / PAGE_SIZE), 1),
  };
}

export async function getSupplier(id: string) {
  if (isMockMode()) {
    return requireDetailRow(mockSuppliers.find((row) => row.id === id), "Supplier", id);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("suppliers").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return requireDetailRow(data, "Supplier", id);
}
