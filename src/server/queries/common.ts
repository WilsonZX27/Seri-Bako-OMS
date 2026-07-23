import { createClient } from "@/lib/supabase/server";
import { isMockMode, mockBranches, mockCompany, mockItems, mockProfile, mockSuppliers } from "@/lib/mock-mode";
import { cache } from "react";

export const getCurrentProfile = cache(async function getCurrentProfile() {
  if (isMockMode()) {
    return mockProfile;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: staff } = await supabase.from("staffs").select("*").eq("auth_user_id", user.id).maybeSingle();
  if (staff && staff.status === "active" && !staff.deleted_at) {
    const { data: staffRoles } = await supabase
      .from("staff_roles")
      .select("role_id, is_primary, effective_from, effective_to")
      .eq("staff_id", staff.id);
    const today = new Date().toISOString().slice(0, 10);
    const activeRoles = (staffRoles ?? []).filter((row) => {
      const role = row as { effective_from?: string; effective_to?: string | null };
      return (!role.effective_from || role.effective_from <= today) && (!role.effective_to || role.effective_to >= today);
    });
    // Access is an authorization boundary: never let returned row order choose a
    // membership. Exactly one active primary role is the only valid normal state.
    const primaryRoles = activeRoles.filter((row) => row.is_primary);
    const primaryRole = primaryRoles.length === 1 ? primaryRoles[0] : null;
    let roleCode: string | null = null;

    if (primaryRole?.role_id) {
      const { data: role } = await supabase
        .from("roles")
        .select("role_code")
        .eq("id", primaryRole.role_id)
        .eq("company_id", staff.company_id)
        .eq("status", "active")
        .is("deleted_at", null)
        .maybeSingle();
      roleCode = role?.role_code ?? null;
    }

    return { ...staff, role: roleCode, role_code: roleCode, has_staff_role: Boolean(roleCode) };
  }

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data ? { ...data, company_id: null, role_code: data.role, has_staff_role: false } : null;
});

export const getCompanyBranding = cache(async function getCompanyBranding() {
  if (isMockMode()) {
    return { company_name: mockCompany.company_name, logo_url: mockCompany.logo_url };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select("company_name, logo_url")
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return {
    company_name: data?.company_name ?? "Seri Bako",
    logo_url: data?.logo_url ?? null,
  };
});

export const getSuppliersForSelect = cache(async function getSuppliersForSelect() {
  if (isMockMode()) {
    return mockSuppliers.map(({ id, supplier_code, name, status }) => ({ id, supplier_code, name, status }));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, supplier_code, name, status")
    .eq("status", "active")
    .order("name", { ascending: true })
    .limit(200);

  if (error) throw new Error(error.message);
  return data;
});

export const getBranchSupplierMappingsForSelect = cache(async function getBranchSupplierMappingsForSelect() {
  if (isMockMode()) return [];
  const supabase = await createClient();
  const { data: mappings, error: mappingsError } = await supabase
    .from("branch_supplier_items")
    .select("id, branch_id, supplier_item_id, item_id, is_preferred, status")
    .eq("status", "active")
    .is("deleted_at", null);
  if (mappingsError) throw new Error(mappingsError.message);
  const relationshipIds = [...new Set((mappings ?? []).map((row) => row.supplier_item_id))];
  const { data: relationships, error: relationshipsError } = relationshipIds.length
    ? await supabase.from("supplier_items").select("id, supplier_id, item_id, unit_cost, purchase_uom, status").in("id", relationshipIds).eq("status", "active").is("deleted_at", null)
    : { data: [], error: null };
  if (relationshipsError) throw new Error(relationshipsError.message);
  const supplierIds = [...new Set((relationships ?? []).map((row) => row.supplier_id))];
  const { data: suppliers, error: suppliersError } = supplierIds.length
    ? await supabase.from("suppliers").select("id, supplier_code, name, status").in("id", supplierIds).eq("status", "active").is("deleted_at", null)
    : { data: [], error: null };
  if (suppliersError) throw new Error(suppliersError.message);
  const relationshipById = new Map((relationships ?? []).map((row) => [row.id, row]));
  const supplierById = new Map((suppliers ?? []).map((row) => [row.id, row]));
  return (mappings ?? []).flatMap((mapping) => {
    const relationship = relationshipById.get(mapping.supplier_item_id);
    const supplier = relationship ? supplierById.get(relationship.supplier_id) : null;
    if (!relationship || !supplier || relationship.item_id !== mapping.item_id) return [];
    return [{
      id: mapping.id,
      branch_id: mapping.branch_id,
      item_id: mapping.item_id,
      supplier_item_id: mapping.supplier_item_id,
      supplier_id: supplier.id,
      supplier_code: supplier.supplier_code,
      supplier_name: supplier.name,
      unit_cost: relationship.unit_cost,
      purchase_uom: relationship.purchase_uom,
      is_preferred: mapping.is_preferred,
    }];
  });
});

export const getItemsForSelect = cache(async function getItemsForSelect() {
  if (isMockMode()) {
    return mockItems
      .filter((item) => item.status === "active")
      .map(({ id, item_code, item_name, base_unit, purchase_unit, supplier_id, cost, status }) => ({ id, item_code, item_name, base_unit, purchase_unit, supplier_id, cost, status }));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select("id, item_code, item_name, base_unit, purchase_unit, supplier_id, cost, status")
    .eq("status", "active")
    .order("item_name", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
});

export async function getDefaultCompanyId() {
  if (isMockMode()) return "company-seri-bako";
  const supabase = await createClient();
  const { data, error } = await supabase.from("companies").select("id").is("deleted_at", null).order("created_at", { ascending: true }).limit(1).single();
  if (error) throw new Error(error.message);
  return data.id;
}

export const getBranchesForSelect = cache(async function getBranchesForSelect() {
  if (isMockMode()) {
    return mockBranches
      .filter((branch) => branch.status === "active")
      .map(({ id, branch_code, branch_name, status }) => ({ id, branch_code, branch_name, status }));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .select("id, branch_code, branch_name, status")
    .eq("status", "active")
    .order("branch_name", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
});
