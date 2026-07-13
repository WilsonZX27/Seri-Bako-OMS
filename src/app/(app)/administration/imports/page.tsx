import Link from "next/link";
import { Database, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { importTemplates, type ImportEntity } from "@/lib/imports/config";
import { hasPermission } from "@/server/auth/permissions";

const coreImports: ImportEntity[] = ["items", "suppliers", "branches", "staff", "opening-stock"];

export default async function ImportCenterPage() {
  const allowed = (await hasPermission("imports.create")) || (await hasPermission("company.update"));
  return (
    <>
      <PageHeader title="Import Center" description="Fixed templates for core master-data setup." />
      <WorkspaceGrid rightRail={<><ConsoleSection title="Fixed Template Flow"><ol className="space-y-2 text-xs text-muted-foreground"><li>1. Choose the record type.</li><li>2. Download its fixed template.</li><li>3. Upload CSV or XLSX.</li><li>4. Review row validation.</li><li>5. Confirm valid rows.</li></ol></ConsoleSection><ConsoleSection title="Import Limits"><p className="text-xs text-muted-foreground">Files must use the supplied columns, remain under 2 MB, and contain no more than 500 rows.</p></ConsoleSection></>}>
        {!allowed ? (
          <Card><CardContent className="p-5 text-sm text-muted-foreground">You do not have permission to manage imports.</CardContent></Card>
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
            {coreImports.map((entity) => {
              const spec = importTemplates[entity];
              const href = entity === "opening-stock" ? "/opening-stock/import" : `/imports/${entity}`;
              return (
                <div key={entity} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-primary" />
                      <h2 className="font-semibold">{spec.label}</h2>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{spec.description}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">Fixed columns: {spec.headers.join(", ")}</p>
                  </div>
                    <Button asChild size="sm"><Link href={href}><Upload className="h-4 w-4" /> Open import</Link></Button>
                </div>
              );
            })}
            </CardContent>
          </Card>
        )}
      </WorkspaceGrid>
    </>
  );
}
