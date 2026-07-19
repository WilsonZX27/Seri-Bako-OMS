import { isMockMode, mockProductPackaging, mockProducts } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import type { ItemStatus } from "@/types/database";

type ProductFilters = {
  search?: string;
  status?: string;
  category?: string;
  sort?: string;
  dir?: string;
  page?: string;
};

function compareValues(a: unknown, b: unknown, direction: string) {
  const normalizedA = typeof a === "number" ? a : String(a ?? "").toLowerCase();
  const normalizedB = typeof b === "number" ? b : String(b ?? "").toLowerCase();
  const result = normalizedA > normalizedB ? 1 : normalizedA < normalizedB ? -1 : 0;
  return direction === "desc" ? -result : result;
}

function filterProducts<T extends { product_code: string; product_name: string; category: string; status: string }>(
  products: T[],
  filters: ProductFilters,
) {
  const search = filters.search?.trim().toLowerCase();
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  const category = filters.category && filters.category !== "all" ? filters.category : null;
  const sort = filters.sort ?? "product_name";
  const dir = filters.dir === "desc" ? "desc" : "asc";

  return products.filter((product) => {
    const matchesSearch = search
      ? [product.product_code, product.product_name, product.category].some((value) => value.toLowerCase().includes(search))
      : true;
    const matchesStatus = status ? product.status === status : true;
    const matchesCategory = category ? product.category === category : true;
    return matchesSearch && matchesStatus && matchesCategory;
  }).sort((a, b) => compareValues(a[sort as keyof T], b[sort as keyof T], dir));
}

function isItemStatus(value: string): value is ItemStatus {
  return value === "active" || value === "inactive";
}

export async function getProducts(filters: ProductFilters = {}) {
  if (isMockMode()) {
    return filterProducts(mockProducts, filters);
  }

  const supabase = await createClient();
  let query = supabase.from("products").select("*").order("product_name", { ascending: true });

  if (filters.status && isItemStatus(filters.status)) {
    query = query.eq("status", filters.status);
  }

  if (filters.search?.trim()) {
    const search = filters.search.trim();
    query = query.or(`product_code.ilike.%${search}%,product_name.ilike.%${search}%,category.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return filterProducts(data ?? [], filters);
}

export async function getProductPackaging(productId: string) {
  if (isMockMode()) {
    return mockProductPackaging.filter((row) => row.product_id === productId);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_packaging")
    .select("*")
    .eq("product_id", productId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getProduct(id: string) {
  if (isMockMode()) {
    const product = mockProducts.find((row) => row.id === id);
    if (!product) throw new Error("Mock product not found");
    return product;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}
