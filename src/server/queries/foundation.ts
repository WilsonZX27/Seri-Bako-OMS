import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { requireDetailRow } from "@/server/queries/detail";
import { getCurrentProfile } from "@/server/queries/common";
import { hasUniqueValidAuthLink, listAuthUserSummaries } from "@/server/auth/admin-users";
import { getRoleDisplayLabel, sortRolesForDisplay, SYSTEM_ROLE_CODES } from "@/lib/roles";
import type { Database } from "@/types/database";
import {
  isMockMode,
  mockBranches,
  mockCompany,
  mockDocumentSequences,
  mockPermissions,
  mockRoles,
  mockStaffBranches,
  mockStaffRoles,
  mockStaffs,
} from "@/lib/mock-mode";

type Filters = {
  branch_id?: string;
  search?: string;
  status?: string;
};

type StaffStatus = NonNullable<Database["public"]["Tables"]["staffs"]["Row"]["status"]>;

function wantsArchived(status?: string) {
  return status === "archived";
}

function wantsAllStatuses(status?: string) {
  return status === "all";
}

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

  const [supabase, profile] = await Promise.all([createClient(), getCurrentProfile()]);
  if (!profile?.company_id) return [];
  let query = supabase.from("branches").select("*").order("branch_name", { ascending: true });
  query = query.eq("company_id", profile.company_id);
  if (wantsArchived(filters.status)) query = query.not("deleted_at", "is", null);
  else if (!wantsAllStatuses(filters.status)) query = query.is("deleted_at", null);
  const search = filters.search?.trim().replace(/[,%()]/g, " ");
  if (search) {
    const normalizedType = search.toLowerCase().replace(/\s+/g, "_");
    const branchTypes = ["central_kitchen", "outlet", "event_booth", "office", "other"];
    const clauses = [`branch_code.ilike.%${search}%`, `branch_name.ilike.%${search}%`];
    if (branchTypes.includes(normalizedType)) clauses.push(`branch_type.eq.${normalizedType}`);
    query = query.or(clauses.join(","));
  }
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status as "active" | "inactive" | "archived");
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getBranch(id: string) {
  if (isMockMode()) {
    return requireDetailRow(mockBranches.find((row) => row.id === id), "Branch", id);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("branches").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return requireDetailRow(data, "Branch", id);
}

export async function getBranchSupplyRouteContext() {
  const empty = { available: true, centralKitchens: [], outlets: [], routes: [] };
  if (isMockMode()) return { ...empty, centralKitchens: mockBranches.filter((row) => row.branch_type === "central_kitchen" && row.status === "active"), outlets: mockBranches.filter((row) => row.branch_type === "outlet" && row.status === "active") };
  const [supabase, profile] = await Promise.all([createClient(), getCurrentProfile()]);
  if (!profile?.company_id) return empty;
  const [branchesResult, routesResult] = await Promise.all([
    supabase.from("branches").select("id, branch_code, branch_name, branch_type").eq("company_id", profile.company_id).eq("status", "active").is("deleted_at", null).in("branch_type", ["central_kitchen", "outlet"]).order("branch_name"),
    supabase.from("branch_supply_routes").select("source_branch_id, destination_branch_id").eq("company_id", profile.company_id).eq("status", "active").eq("is_primary", true).is("effective_to", null),
  ]);
  if (branchesResult.error) throw new Error(branchesResult.error.message);
  if (routesResult.error) {
    if (routesResult.error.code === "42P01" || routesResult.error.code === "PGRST205") return { ...empty, available: false };
    throw new Error(routesResult.error.message);
  }
  const branches = branchesResult.data ?? [];
  return { available: true, centralKitchens: branches.filter((row) => row.branch_type === "central_kitchen"), outlets: branches.filter((row) => row.branch_type === "outlet"), routes: routesResult.data ?? [] };
}

export async function getStaffs(filters: Filters = {}) {
  if (isMockMode()) {
    const roleById = new Map(mockRoles.map((role) => [role.id, role]));
    const branchById = new Map(mockBranches.map((branch) => [branch.id, branch]));
    return mockStaffs
      .filter((staff) => !filters.branch_id || filters.branch_id === "all" || mockStaffBranches.some((row) => row.staff_id === staff.id && row.branch_id === filters.branch_id))
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

  const [supabase, profile] = await Promise.all([createClient(), getCurrentProfile()]);
  if (!profile?.company_id) return [];
  let staffQuery = supabase
    .from("staffs")
    .select("*")
    .eq("company_id", profile.company_id)
    .is("deleted_at", null)
    .order("full_name", { ascending: true });
  const search = filters.search?.trim().replace(/[,%()]/g, " ");
  if (search) staffQuery = staffQuery.or(`staff_code.ilike.%${search}%,full_name.ilike.%${search}%,email.ilike.%${search}%`);
  if (filters.status && filters.status !== "all") staffQuery = staffQuery.eq("status", filters.status as StaffStatus);
  const { data: staffs, error: staffsError } = await staffQuery;
  if (staffsError) throw new Error(staffsError.message);
  const staffIds = (staffs ?? []).map((staff) => staff.id);
  if (!staffIds.length) return [];
  const [
    { data: branches, error: branchesError },
    { data: roles, error: rolesError },
    { data: staffRoles, error: staffRolesError },
    { data: staffBranches, error: staffBranchesError },
  ] = await Promise.all([
    supabase.from("branches").select("id, branch_name").eq("company_id", profile.company_id).is("deleted_at", null),
    supabase.from("roles").select("id, role_name, role_code").eq("company_id", profile.company_id).is("deleted_at", null),
    supabase.from("staff_roles").select("staff_id, role_id").in("staff_id", staffIds),
    supabase.from("staff_branches").select("staff_id, branch_id, access_level, is_default").in("staff_id", staffIds),
  ]);
  if (branchesError) throw new Error(branchesError.message);
  if (rolesError) throw new Error(rolesError.message);
  if (staffRolesError) throw new Error(staffRolesError.message);
  if (staffBranchesError) throw new Error(staffBranchesError.message);
  // Directory reads are RLS-scoped and remain useful when a local preview does
  // not have the privileged Auth Admin credential. Only auth-link health drops.
  const authUsers = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ? await listAuthUserSummaries() : [];
  const branchById = new Map((branches ?? []).map((branch) => [branch.id, branch.branch_name]));
  const roleById = new Map((roles ?? []).map((role) => [role.id, getRoleDisplayLabel(role.role_code, role.role_name)]));
  return (staffs ?? [])
    .filter((staff) => !filters.branch_id || filters.branch_id === "all" || (staffBranches ?? []).some((row) => row.staff_id === staff.id && row.branch_id === filters.branch_id))
    .map((staff) => {
      const assignedRoles = (staffRoles ?? []).filter((row) => row.staff_id === staff.id).map((row) => roleById.get(row.role_id)).filter(Boolean);
      const defaultBranch = (staffBranches ?? []).find((row) => row.staff_id === staff.id && row.is_default);
      return {
        ...staff,
        default_branch_name: defaultBranch ? branchById.get(defaultBranch.branch_id) ?? null : null,
        branch_access_level: defaultBranch?.access_level ?? null,
        role_name: assignedRoles.join(", ") || null,
        role_code: null,
        auth_link_valid: hasUniqueValidAuthLink(staff, authUsers),
      };
    });
}

export async function getStaff(id: string) {
  if (isMockMode()) {
    return requireDetailRow(mockStaffs.find((row) => row.id === id), "Staff", id);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("staffs").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  const staff = requireDetailRow(data, "Staff", id);
  const authUsers = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ? await listAuthUserSummaries() : [];
  return { ...staff, auth_link_valid: hasUniqueValidAuthLink(staff, authUsers) };
}

export async function getStaffSensitiveEmployment(staffId:string){
 if(isMockMode())return null;
 const supabase=looseSupabase(await createClient());
 const {data,error}=await supabase.from("staff_sensitive_employment").select("passport_number,basic_salary,updated_at").eq("staff_id",staffId).maybeSingle();
 if(error)throw new Error(error.message);
 return data as unknown as {passport_number:string|null;basic_salary:number|null;updated_at:string}|null;
}

export async function getStaffProfileSummary(staffId: string) {
  if (isMockMode()) {
    return (await getStaffs()).find((staff) => staff.id === staffId) ?? null;
  }

  const [supabase, profile] = await Promise.all([createClient(), getCurrentProfile()]);
  if (!profile?.company_id) return null;
  const [{ data: staffRoles, error: staffRolesError }, { data: staffBranches, error: staffBranchesError }] = await Promise.all([
    supabase.from("staff_roles").select("role_id").eq("staff_id", staffId),
    supabase.from("staff_branches").select("branch_id,is_default").eq("staff_id", staffId),
  ]);
  if (staffRolesError) throw new Error(staffRolesError.message);
  if (staffBranchesError) throw new Error(staffBranchesError.message);
  const roleIds = (staffRoles ?? []).map((row) => row.role_id);
  const defaultBranchId = (staffBranches ?? []).find((row) => row.is_default)?.branch_id;
  const [{ data: roles, error: rolesError }, { data: branch, error: branchError }] = await Promise.all([
    roleIds.length
      ? supabase.from("roles").select("role_code,role_name").eq("company_id", profile.company_id).in("id", roleIds)
      : Promise.resolve({ data: [], error: null }),
    defaultBranchId
      ? supabase.from("branches").select("branch_name").eq("company_id", profile.company_id).eq("id", defaultBranchId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (rolesError) throw new Error(rolesError.message);
  if (branchError) throw new Error(branchError.message);
  return {
    role_name: (roles ?? []).map((role) => getRoleDisplayLabel(role.role_code, role.role_name)).join(", ") || null,
    default_branch_name: branch?.branch_name ?? null,
  };
}

export async function getStaffAccess(staffId: string) {
  if (isMockMode()) {
    return {
      staffRole: mockStaffRoles.find((row) => row.staff_id === staffId && row.is_primary) ?? null,
      staffRoles: mockStaffRoles.filter((row) => row.staff_id === staffId),
      staffBranch: mockStaffBranches.find((row) => row.staff_id === staffId && row.is_default) ?? null,
      staffBranchIds: mockStaffBranches.filter((row) => row.staff_id === staffId).map((row) => row.branch_id),
    };
  }

  const supabase = await createClient();
  const [{ data: staffRole, error: roleError }, { data: staffRoles, error: rolesError }, { data: staffBranches, error: branchError }] = await Promise.all([
    supabase.from("staff_roles").select("*").eq("staff_id", staffId).eq("is_primary", true).maybeSingle(),
    supabase.from("staff_roles").select("*").eq("staff_id", staffId),
    supabase.from("staff_branches").select("*").eq("staff_id", staffId),
  ]);
  if (roleError) throw new Error(roleError.message);
  if (rolesError) throw new Error(rolesError.message);
  if (branchError) throw new Error(branchError.message);
  const staffBranch = (staffBranches ?? []).find((row) => row.is_default) ?? null;
  return {
    staffRole,
    staffRoles: staffRoles ?? [],
    staffBranch,
    staffBranchIds: (staffBranches ?? []).map((row) => row.branch_id),
  };
}

export async function getRoles(filters: Filters = {}) {
  if (isMockMode()) {
    return sortRolesForDisplay(mockRoles.filter((role) => SYSTEM_ROLE_CODES.includes(role.role_code as (typeof SYSTEM_ROLE_CODES)[number]) && matchesFilter([role.role_code, role.role_name, role.description], filters, role.status)));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("roles").select("*").in("role_code", [...SYSTEM_ROLE_CODES]).is("deleted_at", null).order("role_name", { ascending: true });
  if (error) throw new Error(error.message);
  return sortRolesForDisplay((data ?? []).filter((role) => matchesFilter([role.role_code, role.role_name, role.description], filters, role.status)));
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

export async function getRolePermissionManagement(roleId: string) {
  if (isMockMode()) {
    const role = mockRoles.find((row) => row.id === roleId);
    if (!role) throw new Error("Mock role not found");
    return { role, permissions: mockPermissions, selectedPermissionIds: new Set<string>(), assignedUsers: [], assignedCount: 0 };
  }

  const supabase = await createClient();
  const [{ data: role, error: roleError }, { data: permissions, error: permissionsError }, { data: rolePermissions, error: rolePermissionsError }, { data: assignments, error: assignmentsError }] = await Promise.all([
    supabase.from("roles").select("*").eq("id", roleId).single(),
    supabase.from("permissions").select("id, permission_code, module, action, description").order("module").order("action"),
    supabase.from("role_permissions").select("permission_id").eq("role_id", roleId),
    supabase.from("staff_roles").select("staff_id").eq("role_id", roleId).limit(26),
  ]);
  if (roleError) throw new Error(roleError.message);
  if (permissionsError) throw new Error(permissionsError.message);
  if (rolePermissionsError) throw new Error(rolePermissionsError.message);
  if (assignmentsError) throw new Error(assignmentsError.message);
  const staffIds = (assignments ?? []).map((row) => row.staff_id);
  const { data: staffs, error: staffError } = staffIds.length ? await supabase.from("staffs").select("id, full_name, staff_code, status, default_branch_id").in("id", staffIds) : { data: [], error: null };
  if (staffError) throw new Error(staffError.message);
  const branchIds = (staffs ?? []).flatMap((staff) => staff.default_branch_id ? [staff.default_branch_id] : []);
  const { data: branches, error: branchError } = branchIds.length ? await supabase.from("branches").select("id, branch_name").in("id", branchIds) : { data: [], error: null };
  if (branchError) throw new Error(branchError.message);
  const branchById = new Map((branches ?? []).map((branch) => [branch.id, branch.branch_name]));
  return {
    role,
    permissions: permissions ?? [],
    selectedPermissionIds: new Set((rolePermissions ?? []).map((row) => row.permission_id)),
    assignedUsers: (staffs ?? []).slice(0, 25).map((staff) => ({ ...staff, branch_name: staff.default_branch_id ? branchById.get(staff.default_branch_id) ?? null : null })),
    assignedCount: assignments?.length === 26 ? "25+" : assignments?.length ?? 0,
  };
}

export async function getStaffPermissionAccess(staffId: string) {
  if (isMockMode()) {
    return mockPermissions.map((permission) => ({ ...permission, roleDefault: false, override: null as "allow" | "deny" | null, effective: false }));
  }

  const supabase = await createClient();
  const { data: staffRoles, error: staffRoleError } = await supabase.from("staff_roles").select("role_id, effective_from, effective_to").eq("staff_id", staffId);
  if (staffRoleError) throw new Error(staffRoleError.message);
  const today = new Date().toISOString().slice(0, 10);
  const activeRoleIds = (staffRoles ?? [])
    .filter((row) => (!row.effective_from || row.effective_from <= today) && (!row.effective_to || row.effective_to >= today))
    .map((row) => row.role_id);
  const [{ data: permissions, error: permissionError }, { data: rolePermissions, error: roleError }, { data: overrides, error: overrideError }] = await Promise.all([
    supabase.from("permissions").select("id, permission_code, module, action, description").order("module").order("action"),
    activeRoleIds.length ? supabase.from("role_permissions").select("permission_id").in("role_id", activeRoleIds) : Promise.resolve({ data: [], error: null }),
    supabase.from("staff_permission_overrides").select("permission_id, effect").eq("staff_id", staffId),
  ]);
  if (permissionError) throw new Error(permissionError.message);
  if (roleError) throw new Error(roleError.message);
  if (overrideError) throw new Error(overrideError.message);

  const rolePermissionIds = new Set((rolePermissions ?? []).map((row) => row.permission_id));
  const overrideByPermission = new Map((overrides ?? []).map((row) => [row.permission_id, row.effect]));
  return (permissions ?? []).map((permission) => {
    const roleDefault = rolePermissionIds.has(permission.id);
    const override = overrideByPermission.get(permission.id) ?? null;
    return { ...permission, roleDefault, override, effective: override === "allow" || (override !== "deny" && roleDefault) };
  });
}

function sequencePeriod(resetFrequency: string, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  if (resetFrequency === "never") return { start: "1970-01-01", label: "ALL" };
  if (resetFrequency === "yearly") return { start: `${year}-01-01`, label: String(year) };
  if (resetFrequency === "quarterly") {
    const quarter = Math.floor((month - 1) / 3) + 1;
    return { start: `${year}-${String((quarter - 1) * 3 + 1).padStart(2, "0")}-01`, label: `Q${quarter}${String(year).slice(-2)}` };
  }
  if (resetFrequency === "daily") return { start: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`, label: `${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}${String(year).slice(-2)}` };
  const label = new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit", timeZone: "Asia/Kuala_Lumpur" }).format(date).replace(" ", "").toUpperCase();
  return { start: `${year}-${String(month).padStart(2, "0")}-01`, label };
}

export function previewDocumentNumber(prefix: string, nextNumber: number, padding: number, date = new Date(), resetFrequency = "monthly") {
  return `${prefix}/${sequencePeriod(resetFrequency, date).label}/${String(nextNumber).padStart(Math.max(padding, 3), "0")}`;
}

export async function getDocumentSequences(filters: Filters = {}) {
  if (isMockMode()) {
    return mockDocumentSequences
      .map((sequence) => ({ ...sequence, preview_number: previewDocumentNumber(sequence.prefix, sequence.next_number, sequence.padding, new Date(), sequence.reset_frequency) }))
      .filter((sequence) => matchesFilter([sequence.document_type, sequence.prefix, sequence.preview_number], filters, sequence.status));
  }

  const supabase = await createClient();
  let query = supabase.from("document_sequences").select("*").order("document_type", { ascending: true });
  if (wantsArchived(filters.status)) query = query.not("deleted_at", "is", null);
  else if (!wantsAllStatuses(filters.status)) query = query.is("deleted_at", null);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const sequences = data ?? [];
  const { data: periods, error: periodsError } = await supabase
    .from("document_sequence_periods")
    .select("company_id, document_type, period_start, next_number");
  if (periodsError) throw new Error(periodsError.message);
  const nextBySequence = new Map((periods ?? []).map((period) => [`${period.company_id}:${period.document_type}:${period.period_start}`, period.next_number]));
  return sequences
    .map((sequence) => {
      const period = sequencePeriod(sequence.reset_frequency);
      const nextNumber = nextBySequence.get(`${sequence.company_id}:${sequence.document_type}:${period.start}`) ?? 1;
      return { ...sequence, next_number: nextNumber, preview_number: previewDocumentNumber(sequence.prefix, nextNumber, sequence.padding, new Date(), sequence.reset_frequency) };
    })
    .filter((sequence) => matchesFilter([sequence.document_type, sequence.prefix, sequence.preview_number], filters, sequence.status));
}

export async function getDocumentSequence(id: string) {
  if (isMockMode()) {
    return requireDetailRow(mockDocumentSequences.find((row) => row.id === id), "Document sequence", id);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("document_sequences").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  const sequence = requireDetailRow(data, "Document sequence", id);
  const currentPeriod = sequencePeriod(sequence.reset_frequency).start;
  const { data: period, error: periodError } = await supabase
    .from("document_sequence_periods")
    .select("next_number")
    .eq("company_id", sequence.company_id)
    .eq("document_type", sequence.document_type)
    .eq("period_start", currentPeriod)
    .maybeSingle();
  if (periodError) throw new Error(periodError.message);
  return { ...sequence, next_number: period?.next_number ?? 1 };
}
