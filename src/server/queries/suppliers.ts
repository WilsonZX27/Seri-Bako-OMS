import { createClient } from "@/lib/supabase/server";
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

function filterSuppliers<T extends { supplier_code: string | null; name: string; contact_person: string | null; phone: string | null; email: string | null; status: string }>(
  suppliers: T[],
  filters: SupplierFilters,
) {
  const search = filters.search?.trim().toLowerCase();
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  const sort = filters.sort ?? "name";
  const dir = filters.dir === "desc" ? "desc" : "asc";

  return suppliers.filter((supplier) => {
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
  const allowedSorts = ["supplier_code", "name", "contact_person", "phone", "email", "payment_terms_days", "status"];
  const sort = filters.sort && allowedSorts.includes(filters.sort) ? filters.sort : "name";
  let query = supabase.from("suppliers").select("*", { count: "exact" });

  const requestedStatus = filters.status === "archived" ? "inactive" : filters.status;
  if (requestedStatus && isSupplierStatus(requestedStatus)) {
    query = query.eq("status", requestedStatus);
  }

  if (filters.search?.trim()) {
    const search = filters.search.trim();
    query = query.or(`supplier_code.ilike.%${search}%,name.ilike.%${search}%,contact_person.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error, count } = await query
    .order(sort, { ascending: filters.dir !== "desc" })
    .range((requestedPage - 1) * PAGE_SIZE, requestedPage * PAGE_SIZE - 1);
  if (error) throw new Error(error.message);
  const totalRows = count ?? 0;
  return {
    rows: data ?? [],
    page: requestedPage,
    pageSize: PAGE_SIZE,
    totalRows,
    totalPages: Math.max(Math.ceil(totalRows / PAGE_SIZE), 1),
  };
}

export async function getSupplier(id: string) {
  if (isMockMode()) {
    const supplier = mockSuppliers.find((row) => row.id === id);
    if (!supplier) throw new Error("Mock supplier not found");
    return supplier;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("suppliers").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}
