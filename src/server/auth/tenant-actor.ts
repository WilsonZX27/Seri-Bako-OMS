import { isMockMode, mockProfile } from "@/lib/mock-mode";
import { isSuperAdminRole } from "@/lib/roles";
import { getCurrentProfile } from "@/server/queries/common";

export type TenantActor = {
  staffId: string;
  companyId: string;
  roleCode: string;
  fullName: string | null;
  email: string | null;
};

export async function requireActiveTenantActor(options: { owner?: boolean } = {}): Promise<TenantActor> {
  const profile = isMockMode() ? mockProfile : await getCurrentProfile();
  const row = profile as {
    id?: string;
    company_id?: string | null;
    role_code?: string | null;
    role?: string | null;
    status?: string | null;
    deleted_at?: string | null;
    full_name?: string | null;
    email?: string | null;
  } | null;
  const roleCode = row?.role_code ?? row?.role ?? null;

  if (!row?.id || !row.company_id || !roleCode || row.deleted_at || (!isMockMode() && row.status !== "active")) {
    throw new Error("An active staff account is required.");
  }
  if (options.owner && !isSuperAdminRole(roleCode)) {
    throw new Error("An active Owner account is required.");
  }

  return {
    staffId: row.id,
    companyId: row.company_id,
    roleCode,
    fullName: row.full_name ?? null,
    email: row.email ?? null,
  };
}
