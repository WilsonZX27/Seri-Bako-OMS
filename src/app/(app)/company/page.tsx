import { CompanyForm } from "@/components/foundation-forms";
import { CompanyLogoForm } from "@/components/company-logo-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { removeCompanyLogo, updateCompany, updateCompanyLogo } from "@/server/actions/foundation";
import { getCompany } from "@/server/queries/foundation";
import { formatDateTime } from "@/lib/utils";

export default async function CompanyPage({
  searchParams,
}: {
  searchParams: Promise<{ logoError?: string; error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const company = await getCompany();

  return (
    <>
      <PageHeader title="Company Profile" description="Legal identity, contact details, address, and supported brand assets." />
      <WorkspaceGrid
        documentMode
        tabletRailMode="split"
        rightRail={
          <div>
            <ConsoleSection title="Company Actions">
              <div className="grid gap-2">
                <SubmitButton type="submit" form="company-form" className="w-full" pendingLabel="Saving..." data-mobile-primary-action>Save Company</SubmitButton>
                <SubmitButton type="submit" form="company-logo-upload-form" variant="outline" className="w-full" pendingLabel="Uploading...">Upload Logo</SubmitButton>
                {company.logo_url ? <SubmitButton type="submit" form="company-logo-remove-form" variant="ghost" className="w-full" pendingLabel="Removing...">Remove Logo</SubmitButton> : null}
              </div>
            </ConsoleSection>
            <ConsoleSection title="Profile Summary">
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Code</span><strong>{company.company_code}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Status</span><strong>{company.status}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Logo</span><strong>{company.logo_url ? "Uploaded" : "Missing"}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Updated</span><strong>{formatDateTime(company.updated_at).slice(0, 10)}</strong></div>
              </div>
            </ConsoleSection>
          </div>
        }
      >
        {params.error || params.success ? (
          <Card>
            <CardContent className={`p-4 text-sm ${params.error ? "text-destructive" : "text-[var(--sb-success)]"}`}>
              {params.error ?? params.success}
            </CardContent>
          </Card>
        ) : null}
        <CompanyLogoForm
          companyId={company.id}
          logoUrl={company.logo_url}
          logoError={params.logoError}
          uploadAction={updateCompanyLogo}
          removeAction={removeCompanyLogo}
          showActions={false}
        />
        <CompanyForm company={company} action={updateCompany} showSubmit={false} />
      </WorkspaceGrid>
    </>
  );
}
