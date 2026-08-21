import { createClient } from "@/lib/supabase/server";
import { todayInKualaLumpur } from "@/lib/business-date";
import { isMockMode, mockBranches, mockCompany, mockItems, mockProfile, mockSuppliers } from "@/lib/mock-mode";
import { getCurrentUserScope } from "@/server/queries/notifications";
import { cache } from "react";

/**
 * Read boundaries must distinguish a real empty result from a failed or
 * incomplete Supabase payload.  Callers should use these helpers immediately
 * after checking the query error, before mapping or rendering the result.
 */
export function requireReadRows<T>(data: T[] | null | undefined, source: string): T[] {
  if (data == null) throw new Error(`${source} data is temporarily unavailable.`);
  return data;
}

export function requireReadCount(count: number | null | undefined, source: string): number {
  if (count == null) throw new Error(`${source} count is temporarily unavailable.`);
  return count;
}

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
  const today = todayInKualaLumpur();
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
  const { data: { user } } = await supabase.auth.getUser();
  // The companies table remains tenant-protected before authentication. The
  // company-assets bucket is deliberately public, so the auth shell can still
  // show the uploaded brand mark without exposing company records.
  if (!user) {
    const { data: companyFolders, error: folderError } = await supabase.storage
      .from("company-assets")
      .list("", { limit: 2 });
    if (!folderError && companyFolders?.length === 1 && !companyFolders[0]?.id) {
      const folder = companyFolders[0].name;
      const { data: logos, error: logoError } = await supabase.storage
        .from("company-assets")
        .list(folder, { limit: 5, sortBy: { column: "updated_at", order: "desc" } });
      const logo = logoError ? null : logos?.find((file) => file.id && /^logo\.(png|jpe?g|webp|svg)$/i.test(file.name));
      if (logo) {
        const { data } = supabase.storage.from("company-assets").getPublicUrl(`${folder}/${logo.name}`);
        return { company_name: "Seri Bako", logo_url: data.publicUrl };
      }
    }
    return { company_name: "Seri Bako", logo_url: null };
  }
  const profile = await getCurrentProfile();
  if (!profile?.company_id) return { company_name: "Seri Bako", logo_url: null };
  const { data } = await supabase
    .from("companies")
    .select("company_name, logo_url")
    .eq("id", profile.company_id)
    .is("deleted_at", null)
    .maybeSingle();

  return {
    company_name: data?.company_name ?? "Seri Bako",
    logo_url: data?.logo_url ?? null,
  };
});

export const getSuppliersForSelect = cache(async function getSuppliersForSelect() {
  if (isMockMode()) {
    return mockSuppliers.map(({ id, supplier_code, supplier_group, name, status }) => ({ id, supplier_code, supplier_group, name, status }));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("status", "active")
    .order("name", { ascending: true })
    .limit(200);

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Supplier options returned no data.");
  return data.map((supplier) => ({ ...supplier, supplier_group: supplier.supplier_group ?? supplier.supplier_code }));
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
  if (!mappings) throw new Error("Branch supplier mappings returned no data.");
  const relationshipIds = [...new Set((mappings ?? []).map((row) => row.supplier_item_id))];
  const { data: relationships, error: relationshipsError } = relationshipIds.length
    ? await supabase.from("supplier_items").select("id, supplier_id, item_id, unit_cost, purchase_uom, conversion_to_base_uom, status").in("id", relationshipIds).eq("status", "active").is("deleted_at", null)
    : { data: [], error: null };
  if (relationshipsError) throw new Error(relationshipsError.message);
  if (!relationships) throw new Error("Supplier item relationships returned no data.");
  const supplierIds = [...new Set((relationships ?? []).map((row) => row.supplier_id))];
  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("id, company_id, purchase_unit, base_unit, conversion_to_base_unit, supplier_id, cost, status")
    .eq("status", "active")
    .is("deleted_at", null);
  if (itemsError) throw new Error(itemsError.message);
  if (!items) throw new Error("Item supplier defaults returned no data.");
  const { data: branches, error: branchesError } = await supabase
    .from("branches")
    .select("id, company_id, status")
    .eq("status", "active")
    .is("deleted_at", null);
  if (branchesError) throw new Error(branchesError.message);
  if (!branches) throw new Error("Branch supplier scopes returned no data.");
  const masterSupplierIds = items.map((item) => item.supplier_id).filter((id): id is string => Boolean(id));
  const allSupplierIds = [...new Set([...supplierIds, ...masterSupplierIds])];
  const { data: suppliers, error: suppliersError } = allSupplierIds.length
    ? await supabase.from("suppliers").select("*").in("id", allSupplierIds).eq("status", "active").is("deleted_at", null)
    : { data: [], error: null };
  if (suppliersError) throw new Error(suppliersError.message);
  if (!suppliers) throw new Error("Supplier mapping options returned no data.");
  const relationshipById = new Map((relationships ?? []).map((row) => [row.id, row]));
  const supplierById = new Map((suppliers ?? []).map((row) => [row.id, { ...row, supplier_group: row.supplier_group ?? row.supplier_code }]));
  const resolvedMappings = mappings.flatMap((mapping) => {
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
      conversion_to_base_uom: relationship.conversion_to_base_uom,
      is_preferred: mapping.is_preferred,
    }];
  });
  const mappedBranchItems = new Set(resolvedMappings.map((mapping) => `${mapping.branch_id}|${mapping.item_id}`));
  const masterFallbacks = items.flatMap((item) => {
    if (!item.supplier_id) return [];
    const supplier = supplierById.get(item.supplier_id);
    if (!supplier) return [];
    return branches
      .filter((branch) => branch.company_id === item.company_id && !mappedBranchItems.has(`${branch.id}|${item.id}`))
      .map((branch) => ({
        id: `master-default:${branch.id}:${item.id}`,
        branch_id: branch.id,
        item_id: item.id,
        supplier_item_id: `master-default:${item.id}`,
        supplier_id: supplier.id,
        supplier_code: supplier.supplier_code,
        supplier_name: supplier.name,
        unit_cost: item.cost ?? 0,
        purchase_uom: item.purchase_unit ?? item.base_unit,
        conversion_to_base_uom: item.purchase_unit && item.base_unit && item.purchase_unit.toUpperCase() === item.base_unit.toUpperCase()
          ? (item.conversion_to_base_unit ?? 1)
          : null,
        is_preferred: true,
      }));
  });
  return [...resolvedMappings, ...masterFallbacks];
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
  if (!data) throw new Error("Item options returned no data.");
  return data;
});

export async function getDefaultCompanyId() {
  if (isMockMode()) return "company-seri-bako";
  const supabase = await createClient();
  const { data, error } = await supabase.from("companies").select("id").is("deleted_at", null).order("created_at", { ascending: true }).limit(1).single();
  if (error) throw new Error(error.message);
  return data.id;
}

type BranchSelectScope = {
  restrictToActorScope?: boolean;
};

export const getBranchesForSelect = cache(async function getBranchesForSelect(options: BranchSelectScope = {}) {
  if (isMockMode()) {
    return mockBranches
      .filter((branch) => branch.status === "active")
      .map(({ id, branch_code, branch_name, status }) => ({ id, branch_code, branch_name, status }));
  }

  const supabase = await createClient();
  let query = supabase.from("branches").select("id, branch_code, branch_name, status").eq("status", "active");
  if (options.restrictToActorScope) {
    const scope = await getCurrentUserScope();
    if (!scope || (!scope.companyWideAccess && !scope.branchIds.length)) return [];
    if (!scope.companyWideAccess && scope.branchIds.length) {
      query = query.in("id", scope.branchIds);
    }
  }
  const { data, error } = await query.order("branch_name", { ascending: true });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Branch options returned no data.");
  return data;
});
