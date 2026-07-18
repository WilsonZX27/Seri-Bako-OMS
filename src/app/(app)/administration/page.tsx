import { Archive, Building2, ClipboardList, ListChecks, MapPin, UserCog, Users } from "lucide-react";
import { CategoryCardGrid } from "@/components/category-card-grid";
import { PageHeader } from "@/components/ui/page-header";
import { isSuperAdminRole } from "@/lib/roles";
import { getCurrentProfile } from "@/server/queries/common";

const administrationLinks = [
  { href: "/company", title: "Company Profile", description: "Legal profile, contact details, logo, and branding.", icon: Building2 },
  { href: "/branches", title: "Branches / Outlets", description: "Maintain operating branches and outlet access.", icon: Building2 },
  { href: "/locations", title: "Locations", description: "Maintain storage and inventory locations.", icon: MapPin },
  { href: "/staffs", title: "Users & Staff", description: "Invite staff, manage status, and assign branch access.", icon: Users },
  { href: "/roles", title: "Roles & Permissions", description: "Review role definitions, permissions, and access control.", icon: UserCog },
  { href: "/administration/master-data-cleanup", title: "Master Data Cleanup", description: "Review data-quality issues and open affected records.", icon: ListChecks },
  { href: "/administration/imports", title: "Import Data", description: "Import approved master-data templates with validation.", icon: ClipboardList },
];

export default async function AdministrationPage() {
  const profile = await getCurrentProfile();
  const role = (profile as { role_code?: string; role?: string } | null)?.role_code ?? (profile as { role?: string } | null)?.role;
  const links = isSuperAdminRole(role)
    ? [...administrationLinks, { href: "/settings/backups", title: "System Backup", description: "Owner-only local ZIP export of operational data.", icon: Archive }]
    : administrationLinks;

  return (
    <>
      <PageHeader title="Administration" description="Company setup, users, access control, imports, and data quality in one place." />
      <div className="space-y-5 p-5"><CategoryCardGrid items={links} /></div>
    </>
  );
}
