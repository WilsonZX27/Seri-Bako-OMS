import Link from "next/link";
import {
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Factory,
  FileText,
  PackageCheck,
  PackageSearch,
  ScanLine,
  Settings,
  ShoppingCart,
  TriangleAlert,
  Users,
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
  category: string;
  roles: UserRole[] | "all";
};

const categoryDescriptions: Record<string, string> = {
  "Daily Operations": "Fast actions for kitchen and outlet teams.",
  Inventory: "Stock checks, barcode lookups, and movement support.",
  Procurement: "Requests, approvals, and supplier ordering work.",
  Production: "Recipe and kitchen planning tools.",
  Documents: "Approvals, attachments, and activity history.",
  Admin: "People, setup, and system maintenance.",
};

const categoryAccent: Record<string, string> = {
  "Daily Operations": "border-l-[var(--sb-accent)]",
  Inventory: "border-l-emerald-600",
  Procurement: "border-l-sky-600",
  Production: "border-l-amber-600",
  Documents: "border-l-slate-500",
  Admin: "border-l-[var(--sb-primary-dark)]",
};

const roleList = (...values: UserRole[]) => values;

const tools: Tool[] = [
  { href: "/stock-counts/scan", title: "Stock Count Scanner", description: "Count stock by branch with USB, search, or camera scan.", icon: ClipboardCheck, category: "Daily Operations", roles: roleList("admin", "kitchen") },
  { href: "/goods-receivings/scan", title: "Scan Receiving", description: "Prepare receiving lines from scanned items.", icon: PackageCheck, category: "Daily Operations", roles: roleList("admin", "kitchen", "purchasing") },
  { href: "/stock-wastage/new", title: "Report Wastage", description: "Record branch wastage quickly.", icon: TriangleAlert, category: "Daily Operations", roles: roleList("admin", "kitchen") },
  { href: "/stock-transfers/new", title: "Transfer Stock", description: "Move stock between branches; default stores are used automatically.", icon: ScanLine, category: "Daily Operations", roles: roleList("admin", "kitchen") },
  { href: "/items", title: "Find Item", description: "Search item codes, names, images, and barcodes.", icon: PackageSearch, category: "Inventory", roles: roleList("admin", "kitchen", "purchasing") },
  { href: "/purchase-requests/new", title: "Create Purchase Request", description: "Request ingredients or packaging with priority and needed-by date.", icon: ClipboardList, category: "Procurement", roles: roleList("admin", "kitchen", "purchasing") },
  { href: "/purchase-requests", title: "Review PR", description: "Review urgent and pending requests.", icon: CheckCircle2, category: "Procurement", roles: roleList("admin", "purchasing", "finance") },
  { href: "/purchase-orders", title: "Purchase Orders", description: "Review supplier order status.", icon: ShoppingCart, category: "Procurement", roles: roleList("admin", "purchasing", "finance") },
  { href: "/recipes", title: "Recipes", description: "Open recipe and costing records.", icon: Factory, category: "Production", roles: roleList("admin", "kitchen") },
  { href: "/documents", title: "Documents", description: "Open approvals, attachments, comments, and history.", icon: FileText, category: "Documents", roles: "all" },
  { href: "/staffs", title: "Staff", description: "Invite and manage staff access.", icon: Users, category: "Admin", roles: roleList("admin") },
  { href: "/settings", title: "Settings", description: "Company, branches, roles, and numbering.", icon: Settings, category: "Admin", roles: roleList("admin") },
  { href: "/imports/items", title: "Import Data", description: "Download templates and preview imports.", icon: Boxes, category: "Admin", roles: roleList("admin") },
];

function roleAllowed(roles: Tool["roles"], role: UserRole) {
  return roles === "all" || roles.includes(role);
}

export default async function QuickToolsPage() {
  const profile = await getCurrentProfile();
  const role = ((profile as { role_code?: UserRole; role?: UserRole } | null)?.role_code ?? (profile as { role?: UserRole } | null)?.role ?? "viewer") as UserRole;
  const visibleTools = tools.filter((tool) => roleAllowed(tool.roles, role));
  const categories = [...new Set(visibleTools.map((tool) => tool.category))];

  return (
    <>
      <PageHeader title="Quick Tools" description="Small operational shortcuts grouped by the job staff need to finish." />
      <div className="space-y-6 p-5">
        {categories.map((category) => (
          <section key={category} className="space-y-3">
            <div>
              <p className="sb-section-label">{category}</p>
              <h2 className="mt-1 text-lg font-semibold">{category}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{categoryDescriptions[category] ?? "Common shortcuts for this area."}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {visibleTools.filter((tool) => tool.category === category).map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link key={tool.href} href={tool.href} className={`rounded-lg border border-l-4 bg-card p-4 transition-colors hover:border-primary/30 hover:bg-[var(--sb-muted)] ${categoryAccent[category] ?? ""}`}>
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
          </section>
        ))}
        {!visibleTools.length ? (
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">No quick tools are assigned to this role yet. Please contact an Admin if you need access.</CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
