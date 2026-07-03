import { redirect } from "next/navigation";
import { Archive, Download, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { APP_SPRINT, APP_VERSION } from "@/lib/app-version";
import { assertSuperAdminForBackup, BACKUP_TABLES } from "@/server/backup/export";

export const dynamic = "force-dynamic";

export default async function SystemBackupPage() {
  const access = await assertSuperAdminForBackup();
  if (!access.allowed) {
    redirect(`/settings?error=${encodeURIComponent("System Backup is only available to Super Admin / Owner.")}`);
  }

  return (
    <>
      <PageHeader title="System Backup" description="Download a local ZIP backup of Seri Bako OMS operational data." />
      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="sb-icon-tile">
                  <Archive className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold">Backup contents</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    The backup includes a manifest and CSV files for core operational tables. Attachment metadata is included, but attachment files, passwords, Supabase auth tokens, and service keys are never exported.
                  </p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {BACKUP_TABLES.slice(0, 18).map((table) => (
                      <div key={table} className="rounded-md border bg-secondary/30 px-3 py-2 font-mono text-xs text-muted-foreground">
                        {table}
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">Optional tables that do not exist in this database are skipped and noted in manifest.json.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex items-start gap-3 p-5 text-amber-950">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Store this securely</p>
                <p className="mt-1 text-sm leading-6">
                  This backup may contain confidential company data. Download only to trusted devices and keep it away from shared folders.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm font-semibold">Generate backup ZIP</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Current backup manifest will show v{APP_VERSION} and {APP_SPRINT}.</p>
              <Button asChild className="mt-4 w-full">
                <a href="/api/backups/system" download>
                  <Download className="h-4 w-4" />
                  Generate backup ZIP
                </a>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
