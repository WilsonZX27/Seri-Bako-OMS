import Link from "next/link";
import { ArrowRight, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { importEntities, importTemplates } from "@/lib/imports/config";

export default function ImportsPage() {
  return <>
    <PageHeader title="Import Data" description="Choose a guided import workspace for clean, validated records." />
    <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
      {importEntities.map((entity) => {
        const spec = importTemplates[entity];
        return <Card key={entity}>
          <CardContent className="flex h-full flex-col gap-3 p-4">
            <div className="flex items-start gap-3"><span className="rounded bg-secondary p-2"><Upload className="h-4 w-4" aria-hidden="true" /></span><div><h2 className="font-semibold">{spec.label}</h2><p className="mt-1 text-sm text-muted-foreground">{spec.description}</p></div></div>
            <Button asChild variant="outline" className="mt-auto w-full justify-between"><Link href={`/imports/${entity}`}>Open import workspace<ArrowRight className="h-4 w-4" /></Link></Button>
          </CardContent>
        </Card>;
      })}
    </div>
  </>;
}
