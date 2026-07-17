import { Archive, Building2, UserCog, Users } from "lucide-react";
import { CategoryCardGrid } from "@/components/category-card-grid";
import { PageHeader } from "@/components/ui/page-header";
import { isSuperAdminRole } from "@/lib/roles";
import { getCurrentProfile } from "@/server/queries/common";

const settingsLinks = [
  { href: "/company", title: "Company Settings", description: "Legal profile, contact details, logo, and branding.", icon: Building2 },
  { href: "/staffs", title: "Staff Management", description: "Invite staff, manage status, and assign branch access.", icon: Users },
  { href: "/roles", title: "Roles & Permissions", description: "Role definitions, permission matrix, and access control.", icon: UserCog },
];

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  const role = (profile as { role_code?: string; role?: string } | null)?.role_code ?? (profile as { role?: string } | null)?.role;
  const links = isSuperAdminRole(role)
    ? [...settingsLinks, { href: "/settings/backups", title: "System Backup", description: "Owner-only local ZIP backup export for operational data.", icon: Archive }]
    : settingsLinks;

  return (
    <>
      <PageHeader title="Settings" description="System, account, staff, and access controls for Seri Bako OMS." />
      <div className="space-y-5 p-5">
        <CategoryCardGrid items={links} />
      </div>
    </>
  );
}
