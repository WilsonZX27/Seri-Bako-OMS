import { createClient } from "@/lib/supabase/server";
import { isMockMode, mockBranches, mockCompany, mockItems, mockLocations, mockProfile, mockSuppliers } from "@/lib/mock-mode";

export async function getCurrentProfile() {
  if (isMockMode()) {
    return mockProfile;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: staff } = await supabase.from("staffs").select("*").eq("auth_user_id", user.id).maybeSingle();
  if (staff) {
    const { data: staffRoles } = await supabase
      .from("staff_roles")
      .select("role_id, is_primary, effective_from, effective_to")
      .eq("staff_id", staff.id);
    const today = new Date().toISOString().slice(0, 10);
    const activeRoles = (staffRoles ?? []).filter((row) => {
      const role = row as { effective_from?: string; effective_to?: string | null };
      return (!role.effective_from || role.effective_from <= today) && (!role.effective_to || role.effective_to >= today);
    });
    const primaryRole = activeRoles.find((row) => row.is_primary) ?? activeRoles[0];
    let roleCode = "viewer";

    if (primaryRole?.role_id) {
      const { data: role } = await supabase
        .from("roles")
        .select("role_code")
        .eq("id", primaryRole.role_id)
        .eq("status", "active")
        .maybeSingle();
      roleCode = role?.role_code ?? "viewer";
    }

    return { ...staff, role: roleCode, role_code: roleCode, has_staff_role: activeRoles.length > 0 };
  }

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data ? { ...data, company_id: null, role_code: data.role, has_staff_role: false } : null;
}

export async function getCompanyBranding() {
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
}

export async function getSuppliersForSelect() {
  if (isMockMode()) {
    return mockSuppliers.map(({ id, supplier_code, name, status }) => ({ id, supplier_code, name, status }));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, supplier_code, name, status")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function getItemsForSelect() {
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
}

export async function getLocationsForSelect() {
  if (isMockMode()) {
    return mockLocations
      .filter((location) => location.status === "active")
      .map(({ id, branch_id, location_code, location_name, status }) => ({ id, branch_id, location_code, location_name, status }));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("locations")
    .select("id, branch_id, location_code, location_name, status")
    .eq("status", "active")
    .order("location_name", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function getBranchesForSelect() {
  if (isMockMode()) {
    return mockBranches
      .filter((branch) => branch.status === "active")
      .map(({ id, branch_code, branch_name, default_location_id, status }) => ({ id, branch_code, branch_name, default_location_id, status }));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .select("id, branch_code, branch_name, default_location_id, status")
    .eq("status", "active")
    .order("branch_name", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}
