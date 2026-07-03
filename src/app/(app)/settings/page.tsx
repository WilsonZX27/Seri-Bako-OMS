import Link from "next/link";
import { Archive, Building2, FileDigit, MapPin, Settings, UserCog, Users, Warehouse } from "lucide-react";
import { CategoryCardGrid } from "@/components/category-card-grid";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { isSuperAdminRole } from "@/lib/roles";
import { getCurrentProfile } from "@/server/queries/common";

const settingsLinks = [
  { href: "/company", title: "Company", description: "Legal profile, contact details, and Seri Bako logo branding.", icon: Building2 },
  { href: "/branches", title: "Branches", description: "Central kitchen, outlets, event booths, offices, and operating units.", icon: MapPin },
  { href: "/staffs", title: "Staffs", description: "Invite staff, manage status, and assign branch-first access.", icon: Users },
  { href: "/roles", title: "Roles & Permissions", description: "Permission catalogue, role definitions, and admin access control.", icon: UserCog },
  { href: "/document-sequences", title: "Document Sequences", description: "Prefixes, padding, current number, reset rule, and previews.", icon: FileDigit },
  { href: "/uom-conversions", title: "System Preferences", description: "UOM conversions and shared reference settings used across operations.", icon: Settings },
];

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  const role = (profile as { role_code?: string; role?: string } | null)?.role_code ?? (profile as { role?: string } | null)?.role;
  const links = isSuperAdminRole(role)
    ? [...settingsLinks, { href: "/settings/backups", title: "System Backup", description: "Owner-only local ZIP backup export for operational data.", icon: Archive }]
    : settingsLinks;

  return (
    <>
      <PageHeader title="Settings" description="System foundation, users, access, numbering, and owner tools." />
      <div className="space-y-5 p-5">
        <CategoryCardGrid items={links} />
        <Card>
          <CardContent className="flex items-start gap-3 p-5">
            <div className="sb-icon-tile"><Warehouse className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="font-semibold">Advanced inventory locations</p>
              <p className="mt-1 text-sm text-muted-foreground">Locations are internal stock areas. Daily operations use Branch only, while locations remain available for advanced inventory administration.</p>
              <div className="mt-3">
                <Link href="/locations" className="text-sm font-medium text-primary hover:underline">Open Locations</Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
