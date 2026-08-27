import { redirect } from "next/navigation";
import { Archive, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Notice } from "@/components/ui/system-states";
import { APP_SPRINT, APP_VERSION } from "@/lib/app-version";
import { assertSuperAdminForBackup } from "@/server/backup/export";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";

export const dynamic = "force-dynamic";

const backupGroups = [
  { label: "Purchasing", tables: "Purchase Requests · Purchase Orders · Goods Receiving · Returns · Supplier Invoices" },
  { label: "Operations", tables: "Outlet Daily Records · Production Jobs · Stock Counts · Transfers · Wastage" },
  { label: "Master data", tables: "Items · Products · Suppliers · Branches · UOM conversions · Recipes" },
  { label: "Audit context", tables: "Documents · approvals · comments · revisions · attachment metadata" },
];

export default async function SystemBackupPage() {
  const access = await assertSuperAdminForBackup();
  if (!access.allowed) redirect("/access-status?reason=no-permitted-route");
  return <>
    <PageHeader title="System Backup" description="Download a local ZIP backup of operational data." />
    <WorkspaceGrid documentMode tabletRailMode="split" rightRail={<ConsoleSection title="Generate backup ZIP"><p className="text-xs leading-5 text-muted-foreground">Manifest: v{APP_VERSION} / {APP_SPRINT}</p><Button asChild size="sm" className="w-full" data-mobile-primary-action><a href="/api/backups/system" download><Download className="h-4 w-4" />Generate backup ZIP</a></Button></ConsoleSection>}>
      <div className="space-y-5">
        <Card><CardContent className="p-5"><div className="flex items-start gap-4"><div className="sb-icon-tile"><Archive className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="font-semibold">Backup contents</p><p className="mt-1 text-sm leading-6 text-muted-foreground">The ZIP includes the current operational records and a manifest. It includes attachment metadata for audit and restore planning, but not the uploaded file bodies.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{backupGroups.map((group) => <div key={group.label} className="rounded-[var(--sb-radius-control)] border bg-secondary/30 px-3 py-2"><p className="text-xs font-semibold text-[var(--sb-text)]">{group.label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{group.tables}</p></div>)}</div><p className="mt-3 text-xs text-muted-foreground">Never exported: uploaded file bodies, passwords, authentication tokens, or service keys.</p></div></div></CardContent></Card>
        <Notice tone="warning" title="Store this securely" className="p-5"><p className="text-sm leading-6">Download only to trusted devices and keep confidential company data away from shared folders.</p></Notice>
      </div>
    </WorkspaceGrid>
  </>;
}
