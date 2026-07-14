import Link from "next/link";
import { Calculator } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { ProductionJobForm } from "@/components/production-job-form";
import { createProductionJob } from "@/server/actions/production-jobs";
import { hasPermission } from "@/server/auth/permissions";
import { getProductionJobFormOptions } from "@/server/queries/production-jobs";

export default async function NewProductionJobPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [params, allowed, options] = await Promise.all([searchParams, hasPermission("production.create"), getProductionJobFormOptions()]);
  const formId = "production-job-create-form";

  return (
    <>
      <PageHeader title="New Production Job" description="Create a draft job from an active recipe. Draft jobs do not affect stock." />
      <WorkspaceGrid rightRail={allowed ? <ConsoleSection title="Actions"><SubmitButton type="submit" form={formId} disabled={!options.recipes.length || !options.branches.length} pendingLabel="Creating..." className="w-full" data-mobile-primary-action><Calculator className="h-4 w-4" />Create draft production job</SubmitButton></ConsoleSection> : null}>
        {params.error ? <Card><CardContent className="p-4 text-sm text-destructive">{params.error}</CardContent></Card> : null}
        {!allowed ? (
          <Card>
            <CardContent className="space-y-3 p-5">
              <p className="text-sm text-muted-foreground">You do not have permission to create production jobs.</p>
              <Link href="/production/jobs" className="text-sm font-medium text-primary">Back to production jobs</Link>
            </CardContent>
          </Card>
        ) : (
          <ProductionJobForm formId={formId} showSubmit={false} branches={options.branches} recipes={options.recipes} balances={options.balances} action={createProductionJob} />
        )}
      </WorkspaceGrid>
    </>
  );
}
