import Link from "next/link";
import { AlertTriangle, BarChart3, Building2, Factory, Package, QrCode, Scale, Store, Truck, Users, Warehouse } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { hasPermission } from "@/server/auth/permissions";
import { getDataOnboardingSummary } from "@/server/queries/data-onboarding";

function statusLabel(count: number, readyWhenPositive = true) {
  if (readyWhenPositive ? count > 0 : count === 0) return "Ready";
  return "Needs attention";
}

export default async function DataOnboardingPage() {
  const [importAllowed, adminAllowed, summary] = await Promise.all([
    hasPermission("imports.create"),
    hasPermission("company.update"),
    getDataOnboardingSummary(),
  ]);
  const allowed = importAllowed || adminAllowed;

  if (!allowed) {
    return (
      <>
        <PageHeader title="Data Onboarding" description="Guided setup for real Seri Bako operational data." />
        <div className="p-5">
          <Card><CardContent className="p-5 text-sm text-muted-foreground">You do not have permission to manage data onboarding.</CardContent></Card>
        </div>
      </>
    );
  }

  const sections = [
    { title: "Company / Branch readiness", count: summary.branchCount, status: summary.companyCount > 0 && summary.branchCount > 0 && summary.branchesMissingDefault === 0 ? "Ready" : "Needs attention", note: "Daily operations only require Branch. The system keeps an internal stock area for ledger accuracy.", href: "/branches", icon: Building2 },
    { title: "Staff / Role readiness", count: summary.staffCount, status: summary.staffCount > 0 && summary.roleCount > 0 ? "Ready" : "Needs attention", note: "Staff should be invited only after branch and role access are ready.", href: "/staffs", icon: Users },
    { title: "Items import", count: summary.itemCount, status: statusLabel(summary.itemCount), note: "Import raw materials, packaging items, and finished goods before stock or purchasing can be tested.", href: "/imports/items", icon: Package },
    { title: "Suppliers import", count: summary.supplierCount, status: statusLabel(summary.supplierCount), note: "Suppliers should exist before supplier items and costing are imported.", href: "/imports/suppliers", icon: Truck },
    { title: "Supplier Items import", count: summary.supplierItemCount, status: statusLabel(summary.supplierItemCount), note: "This import is important for PO costing.", href: "/imports/supplier-items", icon: Store },
    { title: "UOM Conversions import", count: summary.uomCount, status: statusLabel(summary.uomCount), note: "Set up carton-to-base-unit conversions before posting branch stock.", href: "/imports/uom-conversions", icon: Scale },
    { title: "Barcode Mappings import", count: summary.barcodeCount, status: statusLabel(summary.barcodeCount), note: "Import barcode mappings if your team scans during receiving or stock count.", href: "/imports/barcode-mappings", icon: QrCode },
    { title: "Opening Stock import", count: summary.openingStockCount, status: statusLabel(summary.openingStockCount), note: "Opening stock must be posted through stock ledger. Do not manually edit current stock.", href: "/opening-stock/import", icon: Warehouse },
    { title: "Recipe readiness", count: summary.recipeCount, status: summary.recipeCount > 0 ? "Ready" : "Optional", note: "Create at least one recipe if production testing is planned.", href: "/recipes", icon: Factory },
    { title: "Final readiness checklist", count: summary.companyCount, status: summary.companyCount > 0 && summary.branchCount > 0 && summary.itemCount > 0 && summary.supplierCount > 0 ? "In progress" : "Not started", note: "Use this page as the final check before real branch operation starts.", href: "#readiness", icon: BarChart3 },
  ];

  return (
    <>
      <PageHeader title="Data Onboarding" description="Prepare real Seri Bako data step by step without touching stock balances directly." />
      <div className="space-y-5 p-5">
        <Card className="border-primary/15 bg-[var(--sb-muted)]">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Step 1: Download template. Step 2: Fill data. Step 3: Upload file. Step 4: Preview and validate. Step 5: Confirm import.
          </CardContent>
        </Card>
        <div className="grid gap-4 xl:grid-cols-2">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.title}>
                <CardContent className="flex items-start gap-4 p-5">
                  <div className="sb-icon-tile"><Icon className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{section.title}</p>
                      <span className={`rounded-full px-2 py-1 text-xs ${section.status === "Ready" ? "bg-emerald-50 text-emerald-700" : section.status === "Optional" ? "bg-secondary text-secondary-foreground" : "bg-amber-50 text-amber-700"}`}>{section.status}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{section.note}</p>
                    <p className="mt-3 text-sm font-medium">Record count: {section.count}</p>
                    {section.title === "Company / Branch readiness" && summary.branchesMissingDefault ? (
                      <p className="mt-2 flex items-center gap-2 text-sm text-warning"><AlertTriangle className="h-4 w-4" /> {summary.branchesMissingDefault} branch(es) still need an internal default stock area.</p>
                    ) : null}
                    <div className="mt-4">
                      <Link href={section.href} className="text-sm font-medium text-primary hover:underline">Open</Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <Card id="readiness">
          <CardContent className="space-y-3 p-5">
            <p className="font-semibold">Ready for real operation when</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Company completed</li>
              <li>At least one branch exists</li>
              <li>Each branch has internal default stock area</li>
              <li>Admin user exists</li>
              <li>Staff roles assigned</li>
              <li>Items imported</li>
              <li>Suppliers imported</li>
              <li>Supplier Items imported</li>
              <li>UOM conversions checked</li>
              <li>Barcode mappings imported if used</li>
              <li>Opening stock posted</li>
              <li>At least one recipe created if production testing is planned</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
