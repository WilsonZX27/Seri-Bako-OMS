import { createClient } from "@/lib/supabase/server";
import {
  isMockMode,
  mockBranches,
  mockCompany,
  mockDocumentSequences,
  mockLocations,
  mockPermissions,
  mockRoles,
  mockStaffBranches,
  mockStaffLocations,
  mockStaffRoles,
  mockStaffs,
} from "@/lib/mock-mode";

type Filters = {
  search?: string;
  status?: string;
};

function matchesFilter(values: Array<string | null | undefined>, filters: Filters, status: string) {
  const search = filters.search?.trim().toLowerCase();
  const wantedStatus = filters.status && filters.status !== "all" ? filters.status : null;
  const matchesSearch = search ? values.some((value) => (value ?? "").toLowerCase().includes(search)) : true;
  const matchesStatus = wantedStatus ? status === wantedStatus : true;
  return matchesSearch && matchesStatus;
}

export async function getCompany() {
  if (isMockMode()) return mockCompany;

  const supabase = await createClient();
  const { data, error } = await supabase.from("companies").select("*").order("created_at", { ascending: true }).limit(1).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getCompaniesForSelect() {
  if (isMockMode()) return [mockCompany];

  const supabase = await createClient();
  const { data, error } = await supabase.from("companies").select("*").is("deleted_at", null).order("company_name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getBranches(filters: Filters = {}) {
  if (isMockMode()) {
    return mockBranches.filter((branch) => matchesFilter([branch.branch_code, branch.branch_name, branch.branch_type], filters, branch.status));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("branches").select("*").is("deleted_at", null).order("branch_name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).filter((branch) => matchesFilter([branch.branch_code, branch.branch_name, branch.branch_type], filters, branch.status));
}

export async function getBranch(id: string) {
  if (isMockMode()) {
    const branch = mockBranches.find((row) => row.id === id);
    if (!branch) throw new Error("Mock branch not found");
    return branch;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("branches").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getLocations(filters: Filters = {}) {
  if (isMockMode()) {
    const branchById = new Map(mockBranches.map((branch) => [branch.id, branch]));
    return mockLocations
      .map((location) => {
        const branch = location.branch_id ? branchById.get(location.branch_id) ?? null : null;
        return {
          ...location,
          branch_name: branch?.branch_name ?? null,
          is_system_default: branch?.default_location_id === location.id,
          looks_like_branch_name: Boolean(branch?.branch_name && branch.branch_name === location.location_name),
        };
      })
      .filter((location) => matchesFilter([location.location_code, location.location_name, location.location_type, location.branch_name], filters, location.status));
  }

  const supabase = await createClient();
  const [{ data: locations, error: locationsError }, { data: branches, error: branchesError }] = await Promise.all([
    supabase.from("locations").select("*").is("deleted_at", null).order("location_name", { ascending: true }),
    supabase.from("branches").select("id, branch_name, default_location_id"),
  ]);
  if (locationsError) throw new Error(locationsError.message);
  if (branchesError) throw new Error(branchesError.message);
    const branchById = new Map((branches ?? []).map((branch) => [branch.id, branch]));
    return (locations ?? [])
      .map((location) => {
        const branch = location.branch_id ? branchById.get(location.branch_id) ?? null : null;
        return {
          ...location,
          branch_name: branch?.branch_name ?? null,
          is_system_default: branch?.default_location_id === location.id,
          looks_like_branch_name: Boolean(branch?.branch_name && branch.branch_name === location.location_name),
        };
      })
      .filter((location) => matchesFilter([location.location_code, location.location_name, location.location_type, location.branch_name], filters, location.status));
}

export async function getLocation(id: string) {
  if (isMockMode()) {
    const location = mockLocations.find((row) => row.id === id);
    if (!location) throw new Error("Mock location not found");
    return location;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("locations").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getStaffs(filters: Filters = {}) {
  if (isMockMode()) {
    const roleById = new Map(mockRoles.map((role) => [role.id, role]));
    const branchById = new Map(mockBranches.map((branch) => [branch.id, branch]));
    return mockStaffs
      .map((staff) => {
        const roles = mockStaffRoles.filter((row) => row.staff_id === staff.id).map((row) => roleById.get(row.role_id)?.role_name).filter(Boolean);
        const defaultBranch = mockStaffBranches.find((row) => row.staff_id === staff.id && row.is_default);
        return {
          ...staff,
          role_name: roles.join(", ") || null,
          default_branch_name: defaultBranch ? branchById.get(defaultBranch.branch_id)?.branch_name ?? null : null,
          branch_access_level: defaultBranch?.access_level ?? null,
        };
      })
      .filter((staff) => matchesFilter([staff.staff_code, staff.full_name, staff.email, staff.role_name, staff.default_branch_name], filters, staff.status));
  }

  const supabase = await createClient();
  const [{ data: staffs, error: staffsError }, { data: branches, error: branchesError }, { data: roles }, { data: staffRoles }, { data: staffBranches }] = await Promise.all([
    supabase.from("staffs").select("*").is("deleted_at", null).order("full_name", { ascending: true }),
    supabase.from("branches").select("id, branch_name"),
    supabase.from("roles").select("id, role_name"),
    supabase.from("staff_roles").select("staff_id, role_id"),
    supabase.from("staff_branches").select("staff_id, branch_id, access_level, is_default"),
  ]);
  if (staffsError) throw new Error(staffsError.message);
  if (branchesError) throw new Error(branchesError.message);
  const branchById = new Map((branches ?? []).map((branch) => [branch.id, branch.branch_name]));
  const roleById = new Map((roles ?? []).map((role) => [role.id, role.role_name]));
  return (staffs ?? [])
    .map((staff) => {
      const assignedRoles = (staffRoles ?? []).filter((row) => row.staff_id === staff.id).map((row) => roleById.get(row.role_id)).filter(Boolean);
      const defaultBranch = (staffBranches ?? []).find((row) => row.staff_id === staff.id && row.is_default);
      return {
        ...staff,
        default_branch_name: defaultBranch ? branchById.get(defaultBranch.branch_id) ?? null : null,
        branch_access_level: defaultBranch?.access_level ?? null,
        role_name: assignedRoles.join(", ") || null,
        role_code: null,
      };
    })
    .filter((staff) => matchesFilter([staff.staff_code, staff.full_name, staff.email, staff.default_branch_name], filters, staff.status));
}

export async function getStaff(id: string) {
  if (isMockMode()) {
    const staff = mockStaffs.find((row) => row.id === id);
    if (!staff) throw new Error("Mock staff not found");
    return staff;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("staffs").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getStaffAccess(staffId: string) {
  if (isMockMode()) {
    return {
      staffRole: mockStaffRoles.find((row) => row.staff_id === staffId && row.is_primary) ?? null,
      staffBranch: mockStaffBranches.find((row) => row.staff_id === staffId && row.is_default) ?? null,
      staffLocationIds: mockStaffLocations.filter((row) => row.staff_id === staffId).map((row) => row.location_id),
    };
  }

  const supabase = await createClient();
  const [{ data: staffRole, error: roleError }, { data: staffBranch, error: branchError }, { data: staffLocations, error: locationError }] = await Promise.all([
    supabase.from("staff_roles").select("*").eq("staff_id", staffId).eq("is_primary", true).maybeSingle(),
    supabase.from("staff_branches").select("*").eq("staff_id", staffId).eq("is_default", true).maybeSingle(),
    supabase.from("staff_locations").select("location_id").eq("staff_id", staffId),
  ]);
  if (roleError) throw new Error(roleError.message);
  if (branchError) throw new Error(branchError.message);
  if (locationError) throw new Error(locationError.message);
  return {
    staffRole,
    staffBranch,
    staffLocationIds: (staffLocations ?? []).map((row) => row.location_id),
  };
}

export async function getRoles(filters: Filters = {}) {
  if (isMockMode()) {
    return mockRoles.filter((role) => matchesFilter([role.role_code, role.role_name, role.description], filters, role.status));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("roles").select("*").is("deleted_at", null).order("role_name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).filter((role) => matchesFilter([role.role_code, role.role_name, role.description], filters, role.status));
}

export async function getRole(id: string) {
  if (isMockMode()) {
    const role = mockRoles.find((row) => row.id === id);
    if (!role) throw new Error("Mock role not found");
    return role;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("roles").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getPermissions() {
  if (isMockMode()) return mockPermissions;

  const supabase = await createClient();
  const { data, error } = await supabase.from("permissions").select("*").order("module", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export function previewDocumentNumber(prefix: string, nextNumber: number, padding: number) {
  return `${prefix}-${String(nextNumber).padStart(padding, "0")}`;
}

export async function getDocumentSequences(filters: Filters = {}) {
  if (isMockMode()) {
    return mockDocumentSequences
      .map((sequence) => ({ ...sequence, preview_number: previewDocumentNumber(sequence.prefix, sequence.next_number, sequence.padding) }))
      .filter((sequence) => matchesFilter([sequence.document_type, sequence.prefix, sequence.preview_number], filters, sequence.status));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("document_sequences").select("*").is("deleted_at", null).order("document_type", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((sequence) => ({ ...sequence, preview_number: previewDocumentNumber(sequence.prefix, sequence.next_number, sequence.padding) }))
    .filter((sequence) => matchesFilter([sequence.document_type, sequence.prefix, sequence.preview_number], filters, sequence.status));
}

export async function getDocumentSequence(id: string) {
  if (isMockMode()) {
    const sequence = mockDocumentSequences.find((row) => row.id === id);
    if (!sequence) throw new Error("Mock document sequence not found");
    return sequence;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("document_sequences").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}
