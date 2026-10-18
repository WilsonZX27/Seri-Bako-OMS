import { StaffForm } from "@/components/foundation-forms";
import { StaffPermissionOverrides } from "@/components/staff-permission-overrides";
import { canAssignRoleCode, normalizeRoleCode, sortRolesForDisplay } from "@/lib/roles";
import { getCurrentProfile } from "@/server/queries/common";
import { getBranches, getCompaniesForSelect, getRoles, getStaff, getStaffAccess, getStaffPermissionAccess } from "@/server/queries/foundation";
import { hasPermission } from "@/server/auth/permissions";
import { updateStaff, updateStaffPermissionOverrides, resetStaffPermissionOverrides } from "@/server/actions/foundation";

export async function StaffEmploymentEditor({ id }: { id: string }) {
  if (!(await hasPermission("staffs.update"))) return null;
  const [staff, access, companies, branches, allRoles, profile, permissions, canManage] = await Promise.all([
    getStaff(id), getStaffAccess(id), getCompaniesForSelect(), getBranches({ status: "active" }), getRoles(), getCurrentProfile(), getStaffPermissionAccess(id), hasPermission("roles.update"),
  ]);
  if (!staff || !profile || staff.company_id !== profile.company_id) return null;
  const currentRole = (profile as { role_code?: string; role?: string }).role_code ?? (profile as { role?: string }).role;
  const assignedRole = allRoles.find(role => role.id === access.staffRole?.role_id);
  const protectedRole = normalizeRoleCode(assignedRole?.role_code) === "super_admin";
  if (protectedRole && currentRole !== "super_admin") return null;
  const roles = sortRolesForDisplay(allRoles.filter(role => role.company_id === profile.company_id && (canAssignRoleCode(currentRole, role.role_code) || role.id === assignedRole?.id)));
  const returnTo = `/people/${id}?section=employment`;
  async function save(formData: FormData) { "use server"; formData.set("return_to", returnTo); await updateStaff(id, formData); }
  async function savePermissions(formData: FormData) { "use server"; formData.set("return_to", returnTo); await updateStaffPermissionOverrides(id, formData); }
  async function resetPermissions() { "use server"; await resetStaffPermissionOverrides(id, returnTo); }
  return <div className="space-y-3">
    <StaffForm formId="people-employment-form" staff={staff} access={access} companies={companies.filter(company => company.id === profile.company_id)} branches={branches.filter(branch => branch.company_id === profile.company_id)} roles={roles} action={save} showSubmit={false} />
    <StaffPermissionOverrides permissions={permissions} canManage={canManage} protectedRole={protectedRole} updateAction={savePermissions} resetAction={resetPermissions} />
  </div>;
}
