import { createClient } from "@/lib/supabase/server";
import { isMockMode, mockSuppliers } from "@/lib/mock-mode";
import { compareTableValues } from "@/lib/table-state";
import type { SupplierStatus } from "@/types/database";

type SupplierFilters = {
  search?: string;
  status?: string;
  sort?: string;
  dir?: string;
};

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
    const matchesStatus = status ? supplier.status === status : true;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => compareTableValues(a[sort as keyof T], b[sort as keyof T], dir));
}

function isSupplierStatus(value: string): value is SupplierStatus {
  return value === "active" || value === "inactive";
}

export async function getSuppliers(filters: SupplierFilters = {}) {
  if (isMockMode()) {
    return filterSuppliers(mockSuppliers, filters);
  }

  const supabase = await createClient();
  let query = supabase.from("suppliers").select("*").order("name", { ascending: true });

  if (filters.status && isSupplierStatus(filters.status)) {
    query = query.eq("status", filters.status);
  }

  if (filters.search?.trim()) {
    const search = filters.search.trim();
    query = query.or(`supplier_code.ilike.%${search}%,name.ilike.%${search}%,contact_person.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
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
