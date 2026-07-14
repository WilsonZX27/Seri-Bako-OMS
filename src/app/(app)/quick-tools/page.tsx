import Link from "next/link";
import {
  ClipboardList,
  Database,
  PackageSearch,
  TriangleAlert,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getPermissionMap } from "@/server/auth/permissions";

type Tool = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  permission: string;
};

const tools: Tool[] = [
  { href: "/stock-wastage/new", title: "Report Wastage", description: "Record branch wastage quickly.", icon: TriangleAlert, permission: "stock_wastage.create" },
  { href: "/stock-transfers/new", title: "Transfer Stock", description: "Move stock between branches with defaults handled automatically.", icon: PackageSearch, permission: "stock_transfer.create" },
  { href: "/purchase-requests/new", title: "Create PR", description: "Raise a purchase request fast.", icon: ClipboardList, permission: "purchase_request.create" },
  { href: "/purchase-requests", title: "Review PR", description: "Check urgent and pending requests.", icon: ClipboardList, permission: "purchase_request.read" },
  { href: "/documents", title: "Pending Approvals", description: "Review documents waiting for action.", icon: ClipboardList, permission: "documents.view" },
  { href: "/items", title: "Find Item", description: "Search item code, item name, category, or supplier.", icon: PackageSearch, permission: "items.view" },
  { href: "/data-onboarding", title: "Data Onboarding", description: "Templates, imports, and readiness checks.", icon: Database, permission: "imports.create" },
  { href: "/staffs/new", title: "Staff Invite", description: "Invite a new staff account.", icon: UserPlus, permission: "staffs.create" },
];

export default async function QuickToolsPage() {
  const permissionMap = await getPermissionMap(Array.from(new Set(tools.map((tool) => tool.permission))));
  const visibleTools = tools.filter((tool) => permissionMap[tool.permission]);

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
            <CardContent className="p-5 text-sm text-muted-foreground">No quick tools are assigned to your permissions yet. Please contact an administrator if you need access.</CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
