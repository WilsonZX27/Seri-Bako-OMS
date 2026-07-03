import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ProductionJobForm } from "@/components/production-job-form";
import { createProductionJob } from "@/server/actions/production-jobs";
import { hasPermission } from "@/server/auth/permissions";
import { getProductionJobFormOptions } from "@/server/queries/production-jobs";

export default async function NewProductionJobPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [params, allowed, options] = await Promise.all([searchParams, hasPermission("production.create"), getProductionJobFormOptions()]);

  return (
    <>
      <PageHeader title="New Production Job" description="Create a draft job from an active recipe. Draft jobs do not affect stock." />
      <div className="space-y-5 p-5">
        {params.error ? <Card><CardContent className="p-4 text-sm text-destructive">{params.error}</CardContent></Card> : null}
        {!allowed ? (
          <Card>
            <CardContent className="space-y-3 p-5">
              <p className="text-sm text-muted-foreground">You do not have permission to create production jobs.</p>
              <Link href="/production/jobs" className="text-sm font-medium text-primary">Back to production jobs</Link>
            </CardContent>
          </Card>
        ) : (
          <ProductionJobForm branches={options.branches} recipes={options.recipes} balances={options.balances} action={createProductionJob} />
        )}
      </div>
    </>
  );
}
