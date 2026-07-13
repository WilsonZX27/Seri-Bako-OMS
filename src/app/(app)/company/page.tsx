import { CompanyForm } from "@/components/foundation-forms";
import { CompanyLogoForm } from "@/components/company-logo-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { removeCompanyLogo, updateCompany, updateCompanyLogo } from "@/server/actions/foundation";
import { getCompany } from "@/server/queries/foundation";

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
        rightRail={
          <div>
            <ConsoleSection title="Company Actions">
              <div className="grid gap-2">
                <Button type="submit" form="company-form" className="w-full">Save Company</Button>
                <Button type="submit" form="company-logo-upload-form" variant="outline" className="w-full">Upload Logo</Button>
                {company.logo_url ? <Button type="submit" form="company-logo-remove-form" variant="ghost" className="w-full">Remove Logo</Button> : null}
              </div>
            </ConsoleSection>
            <ConsoleSection title="Profile Summary">
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Code</span><strong>{company.company_code}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Status</span><strong>{company.status}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Logo</span><strong>{company.logo_url ? "Uploaded" : "Missing"}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Updated</span><strong>{new Date(company.updated_at).toLocaleDateString("en-MY")}</strong></div>
              </div>
            </ConsoleSection>
          </div>
        }
      >
        {params.error || params.success ? (
          <Card>
            <CardContent className={`p-4 text-sm ${params.error ? "text-destructive" : "text-emerald-700"}`}>
              {params.error ?? params.success}
            </CardContent>
          </Card>
        ) : null}
        <CompanyLogoForm
          companyId={company.id}
          logoUrl={company.logo_url}
          logoError={params.logoError}
          uploadAction={updateCompanyLogo.bind(null, company.id)}
          removeAction={removeCompanyLogo.bind(null, company.id)}
          showActions={false}
        />
        <CompanyForm company={company} action={updateCompany.bind(null, company.id)} showSubmit={false} />
      </WorkspaceGrid>
    </>
  );
}
