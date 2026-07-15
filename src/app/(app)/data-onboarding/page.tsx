import Link from "next/link";
import { AlertTriangle, ArrowRight, BarChart3, Building2, Factory, Package, Scale, ShieldCheck, Store, Truck, Users, Warehouse, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { cleanDuplicateLocations, fixMissingDefaultLocations } from "@/server/actions/foundation";
import { hasPermission } from "@/server/auth/permissions";
import { getDataOnboardingSummary } from "@/server/queries/data-onboarding";

export const dynamic = "force-dynamic";

function statusLabel(count: number, readyWhenPositive = true) {
  if (readyWhenPositive ? count > 0 : count === 0) return "Ready";
  return "Needs attention";
}

export default async function DataOnboardingPage() {
  try {
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

    const groups = [
      {
        title: "Foundation",
        description: "Set up the operating structure first so every later import lands cleanly.",
        steps: [
          { title: "Company and Branches", count: summary.branchCount, status: summary.companyCount > 0 && summary.branchCount > 0 && summary.branchesMissingDefault === 0 ? "Ready" : "Needs attention", note: "Daily work stays branch-first. Internal stock areas remain behind the scenes for ledger accuracy.", href: "/branches", icon: Building2, cta: "Open branches" },
          { title: "Staff and Roles", count: summary.staffCount, status: summary.staffCount > 0 && summary.roleCount > 0 ? "Ready" : "Needs attention", note: "Invite staff only after branch access and role permissions are ready.", href: "/staffs", icon: Users, cta: "Open staff" },
          { title: "Internal Stock Areas", count: summary.locationCount, status: summary.branchesMissingDefault === 0 ? "Ready" : "Needs attention", note: "Each branch should have one default stock area. Duplicate branch-like locations should be cleaned up.", href: "/locations", icon: ShieldCheck, cta: "Review locations" },
        ],
      },
      {
        title: "Master Data Imports",
        description: "Bring in the records purchasing, stock, and receiving depend on every day.",
        steps: [
          { title: "Items", count: summary.itemCount, status: statusLabel(summary.itemCount), note: "Import raw materials, packaging items, and finished goods first.", href: "/imports/items", icon: Package, cta: "Import items" },
          { title: "Suppliers", count: summary.supplierCount, status: statusLabel(summary.supplierCount), note: "Suppliers should exist before supplier-item costing is loaded.", href: "/imports/suppliers", icon: Truck, cta: "Import suppliers" },
          { title: "Supplier Items", count: summary.supplierItemCount, status: statusLabel(summary.supplierItemCount), note: "This drives PO costing and suggested suppliers.", href: "/imports/supplier-items", icon: Store, cta: "Import supplier items" },
          { title: "UOM Conversions", count: summary.uomCount, status: statusLabel(summary.uomCount), note: "Needed before opening stock and branch operations start.", href: "/imports/uom-conversions", icon: Scale, cta: "Import UOM" },
        ],
      },
      {
        title: "Go-Live Readiness",
        description: "Finish the last operational checks before the branch starts using live stock.",
        steps: [
          { title: "Opening Stock", count: summary.openingStockCount, status: statusLabel(summary.openingStockCount), note: "Opening stock must be posted through the stock ledger, never edited directly.", href: "/opening-stock/import", icon: Warehouse, cta: "Post opening stock" },
          { title: "Recipes", count: summary.recipeCount, status: summary.recipeCount > 0 ? "Ready" : "Optional", note: "Only needed before production testing or recipe costing starts.", href: "/recipes", icon: Factory, cta: "Open recipes" },
          { title: "Final Check", count: summary.companyCount, status: summary.companyCount > 0 && summary.branchCount > 0 && summary.itemCount > 0 && summary.supplierCount > 0 ? "In progress" : "Not started", note: "Use this checklist before switching a branch onto real operation.", href: "#readiness", icon: BarChart3, cta: "Review checklist" },
        ],
      },
    ];

    const readinessChecks = [
      { label: "Company completed", done: summary.companyCount > 0 },
      { label: "At least one branch exists", done: summary.branchCount > 0 },
      { label: "Each branch has a default stock area", done: summary.branchesMissingDefault === 0 },
      { label: "No duplicate internal stock areas need cleanup", done: summary.duplicateLocationCandidates === 0 },
      { label: "Administrator and staff access are ready", done: summary.staffCount > 0 && summary.roleCount > 0 },
      { label: "Items imported", done: summary.itemCount > 0 },
      { label: "Suppliers imported", done: summary.supplierCount > 0 },
      { label: "Supplier items imported", done: summary.supplierItemCount > 0 },
      { label: "Opening stock posted", done: summary.openingStockCount > 0 },
      { label: "Recipes added if production testing is planned", done: summary.recipeCount > 0 },
    ];

    const completedChecks = readinessChecks.filter((check) => check.done).length;
    const overallProgress = Math.round((completedChecks / readinessChecks.length) * 100);

    return (
      <>
        <PageHeader title="Data Onboarding" description="Prepare real Seri Bako data step by step without touching stock balances directly." />
        <div className="space-y-5 p-5">
          <Card className="border-primary/15 bg-[var(--sb-muted)]">
            <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-semibold">Branch-first onboarding</p>
                <p className="mt-1 text-sm text-muted-foreground">Keep the process light for staff. Branch is the main choice, while internal stock areas stay behind the scenes for accuracy.</p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/locations">Review internal stock areas</Link>
                </Button>
                <form action={fixMissingDefaultLocations}>
                  <Button type="submit" size="sm">
                    <Wrench className="mr-2 h-4 w-4" />
                    Fix missing stock areas
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-5">
              {groups.map((group) => (
                <Card key={group.title}>
                  <CardContent className="space-y-4 p-5">
                    <div>
                      <p className="font-semibold">{group.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
                    </div>
                    <div className="space-y-3">
                      {group.steps.map((step) => {
                        const Icon = step.icon;
                        return (
                          <div key={step.title} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
                            <div className="sb-icon-tile">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium">{step.title}</p>
                                <span className={`rounded-full px-2 py-1 text-xs ${step.status === "Ready" ? "bg-emerald-50 text-emerald-700" : step.status === "Optional" ? "bg-secondary text-secondary-foreground" : "bg-amber-50 text-amber-700"}`}>{step.status}</span>
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">{step.note}</p>
                              <p className="mt-2 text-xs text-muted-foreground">Record count: {step.count}</p>
                            </div>
                            <Button asChild variant="outline" size="sm">
                              <Link href={step.href}>
                                {step.cta}
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-5">
              <Card>
                <CardContent className="space-y-4 p-5">
                  <div>
                    <p className="font-semibold">Readiness Summary</p>
                    <p className="mt-1 text-sm text-muted-foreground">A quick view of what is already in place for go-live.</p>
                  </div>
                  <div className="rounded-lg border bg-[var(--sb-muted)] p-4">
                    <p className="text-sm text-muted-foreground">Overall progress</p>
                    <p className="mt-1 text-3xl font-semibold">{overallProgress}%</p>
                    <p className="mt-1 text-xs text-muted-foreground">{completedChecks} of {readinessChecks.length} checks completed</p>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between rounded-lg border p-3"><span>Branches missing default stock area</span><span className="font-semibold">{summary.branchesMissingDefault}</span></div>
                    <div className="flex items-center justify-between rounded-lg border p-3"><span>Duplicate internal stock area groups</span><span className="font-semibold">{summary.duplicateLocationCandidates}</span></div>
                    <div className="flex items-center justify-between rounded-lg border p-3"><span>Items ready</span><span className="font-semibold">{summary.itemCount}</span></div>
                    <div className="flex items-center justify-between rounded-lg border p-3"><span>Suppliers ready</span><span className="font-semibold">{summary.supplierCount}</span></div>
                  </div>
                  <div className="grid gap-2">
                    <form action={fixMissingDefaultLocations}>
                      <Button type="submit" className="w-full">Fix missing internal stock areas</Button>
                    </form>
                    <form action={cleanDuplicateLocations}>
                      <Button type="submit" variant="outline" className="w-full">Clean duplicate locations</Button>
                    </form>
                  </div>
                </CardContent>
              </Card>

              <Card id="readiness">
                <CardContent className="space-y-3 p-5">
                  <p className="font-semibold">Go-live checklist</p>
                  <div className="space-y-2">
                    {readinessChecks.map((check) => (
                      <div key={check.label} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                        <span className={`mt-0.5 h-2.5 w-2.5 rounded-full ${check.done ? "bg-emerald-500" : "bg-amber-500"}`} />
                        <span className={check.done ? "text-foreground" : "text-muted-foreground"}>{check.label}</span>
                      </div>
                    ))}
                  </div>
                  {(summary.branchesMissingDefault > 0 || summary.duplicateLocationCandidates > 0) ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4" />
                        <div>
                          {summary.branchesMissingDefault > 0 ? <p>{summary.branchesMissingDefault} branch(es) still need an internal default stock area.</p> : null}
                          {summary.duplicateLocationCandidates > 0 ? <p>{summary.duplicateLocationCandidates} duplicate location group(s) should be reviewed before live stock work starts.</p> : null}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </>
    );
  } catch (error) {
    console.error(error);
    return (
      <>
        <PageHeader title="Data Onboarding" description="Guided setup for real Seri Bako operational data." />
        <div className="p-5">
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">
              The onboarding workspace could not load right now. Please refresh in a moment.
            </CardContent>
          </Card>
        </div>
      </>
    );
  }
}
