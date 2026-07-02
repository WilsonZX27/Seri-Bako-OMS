import Link from "next/link";
import {
  ClipboardCheck,
  ClipboardList,
  Database,
  PackageCheck,
  PackageSearch,
  ScanLine,
  TriangleAlert,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentProfile } from "@/server/queries/common";
import type { UserRole } from "@/types/database";

type Tool = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  roles: UserRole[];
};

const tools: Tool[] = [
  { href: "/stock-counts/scan", title: "Stock Count", description: "Count stock by branch with search or camera scan.", icon: ClipboardCheck, roles: ["admin", "kitchen"] },
  { href: "/goods-receivings/scan", title: "Scan Receiving", description: "Prepare receiving lines from delivered items.", icon: PackageCheck, roles: ["admin", "kitchen", "purchasing"] },
  { href: "/stock-wastage/new", title: "Report Wastage", description: "Record branch wastage quickly.", icon: TriangleAlert, roles: ["admin", "kitchen"] },
  { href: "/stock-transfers/new", title: "Transfer Stock", description: "Move stock between branches with defaults handled automatically.", icon: ScanLine, roles: ["admin", "kitchen"] },
  { href: "/purchase-requests/new", title: "Create PR", description: "Raise a purchase request fast.", icon: ClipboardList, roles: ["admin", "kitchen", "purchasing"] },
  { href: "/purchase-requests", title: "Review PR", description: "Check urgent and pending requests.", icon: ClipboardList, roles: ["admin", "purchasing", "finance"] },
  { href: "/documents", title: "Pending Approvals", description: "Review documents waiting for action.", icon: ClipboardList, roles: ["admin", "finance", "purchasing"] },
  { href: "/items", title: "Find Item", description: "Search item code, item name, or barcode.", icon: PackageSearch, roles: ["admin", "kitchen", "purchasing", "finance", "viewer"] },
  { href: "/data-onboarding", title: "Data Onboarding", description: "Templates, imports, and readiness checks.", icon: Database, roles: ["admin"] },
  { href: "/staffs/new", title: "Staff Invite", description: "Invite a new staff account.", icon: UserPlus, roles: ["admin"] },
];

export default async function QuickToolsPage() {
  const profile = await getCurrentProfile();
  const role = ((profile as { role_code?: UserRole; role?: UserRole } | null)?.role_code ?? (profile as { role?: UserRole } | null)?.role ?? "viewer") as UserRole;
  const visibleTools = tools.filter((tool) => tool.roles.includes(role));

  return (
    <>
      <PageHeader title="Quick Tools" description="Frequent actions for day-to-day work." />
      <div className="p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {visibleTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.href} href={tool.href} className="rounded-lg border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-[var(--sb-muted)]">
                <div className="flex items-start gap-3">
                  <div className="sb-icon-tile"><Icon className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <p className="font-semibold">{tool.title}</p>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">{tool.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        {!visibleTools.length ? (
          <Card className="mt-4">
            <CardContent className="p-5 text-sm text-muted-foreground">No quick tools are assigned to this role yet. Please contact an Admin if you need access.</CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
