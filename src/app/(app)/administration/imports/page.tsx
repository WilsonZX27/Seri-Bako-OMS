import Link from "next/link";
import { Database, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { importTemplates, type ImportEntity } from "@/lib/imports/config";
import { hasPermission } from "@/server/auth/permissions";

const coreImports: ImportEntity[] = ["items", "suppliers", "branches", "staff", "opening-stock"];

export default async function ImportCenterPage() {
  const allowed = (await hasPermission("imports.create")) || (await hasPermission("company.update"));
  return (
    <>
      <PageHeader title="Import Center" description="Fixed templates for core master-data setup." />
      <div className="p-5">
        {!allowed ? (
          <Card><CardContent className="p-5 text-sm text-muted-foreground">You do not have permission to manage imports.</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {coreImports.map((entity) => {
              const spec = importTemplates[entity];
              const href = entity === "opening-stock" ? "/opening-stock/import" : `/imports/${entity}`;
              return (
                <Card key={entity}>
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-primary" />
                      <h2 className="font-semibold">{spec.label}</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">{spec.description}</p>
                    <p className="text-xs text-muted-foreground">Columns: {spec.headers.join(", ")}</p>
                    <Button asChild size="sm"><Link href={href}><Upload className="h-4 w-4" /> Open import</Link></Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
