import { Building2, FileDigit, MapPin, Settings, UserCog, Users } from "lucide-react";
import { CategoryCardGrid } from "@/components/category-card-grid";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

const settingsLinks = [
  { href: "/company", title: "Company", description: "Legal profile, contact details, and Seri Bako logo branding.", icon: Building2 },
  { href: "/branches", title: "Branches", description: "Central kitchen, outlets, event booths, offices, and operating units.", icon: MapPin },
  { href: "/locations", title: "Locations", description: "Advanced inventory storage areas under each branch.", icon: MapPin },
  { href: "/staffs", title: "Staffs", description: "Invite staff, manage status, and assign branch-first access.", icon: Users },
  { href: "/roles", title: "Roles & Permissions", description: "Permission catalogue, role definitions, and admin access control.", icon: UserCog },
  { href: "/document-sequences", title: "Document Sequences", description: "Prefixes, padding, current number, reset rule, and previews.", icon: FileDigit },
  { href: "/uom-conversions", title: "System Preferences", description: "UOM conversions and shared reference settings used across operations.", icon: Settings },
];

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Use Settings to manage system foundation, users, access, and numbering." />
      <div className="space-y-5 p-5">
        <Card className="border-primary/15 bg-[var(--sb-muted)]">
          <CardContent className="p-5">
            <p className="sb-section-label">Administration hub</p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Keep daily staff focused on operations. Admin-only setup, access, and numbering tools live here so the main sidebar stays simple.
            </p>
          </CardContent>
        </Card>
        <CategoryCardGrid items={settingsLinks} />
      </div>
    </>
  );
}
