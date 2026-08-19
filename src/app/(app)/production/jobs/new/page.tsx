import Link from "next/link";
import { Calculator } from "lucide-react";
import { ActionErrorNotice } from "@/components/action-error-notice";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { SubmitButton } from "@/components/ui/submit-button";
import { ProductionJobForm } from "@/components/production-job-form";
import { createProductionJob } from "@/server/actions/production-jobs";
import { hasPermission } from "@/server/auth/permissions";
import { getProductionJobFormOptions } from "@/server/queries/production-jobs";

export default async function NewProductionJobPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [params, allowed, options] = await Promise.all([searchParams, hasPermission("production.create"), getProductionJobFormOptions()]);
  const formId = "production-job-create-form";
  const primaryAction = allowed ? <SubmitButton type="submit" form={formId} disabled={!options.recipes.length || !options.branches.length} pendingLabel="Creating..." className="w-full"><Calculator className="h-4 w-4" />Create Draft Production Job</SubmitButton> : null;
  const steps = [
    { key: "draft", label: "Draft", description: "Recipe, output, and ingredient quantities can be checked." },
    { key: "submitted", label: "Submitted", description: "The job awaits Manager approval." },
    { key: "approved", label: "Approved", description: "The job is ready to post." },
    { key: "posted", label: "Posted", description: "Stock consumption and output are recorded." },
  ];

  return (
      <DocumentWorkspace
        breadcrumbs={[{ label: "Production Jobs", href: "/production/jobs" }, { label: "New" }]}
        documentNo="New Production Job"
        title="Production Job"
        status="draft"
        workflowSteps={steps}
        currentStatus="draft"
        tabletRailMode="split"
        mobilePrimaryAction={primaryAction}
        sidePanel={<>{primaryAction ? <DocumentSideSection title="Primary Action">{primaryAction}</DocumentSideSection> : null}<DocumentSideSection title="Validation / Next Step"><p className="text-xs text-muted-foreground">Select an active recipe and branch, then check planned output and ingredient availability.</p></DocumentSideSection></>}
      >
        <ActionErrorNotice message={params.error} />
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
      </DocumentWorkspace>
  );
}
