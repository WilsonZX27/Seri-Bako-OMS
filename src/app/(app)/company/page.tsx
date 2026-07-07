import { CompanyForm } from "@/components/foundation-forms";
import { CompanyLogoForm } from "@/components/company-logo-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader title="Company" description="Legal company profile and central Seri Bako identity." />
      <WorkspaceGrid
        rightRail={
          <div className="space-y-3">
            <section className="rounded-lg border bg-card p-3 shadow-sm">
              <h2 className="text-[13px] font-semibold">Company Actions</h2>
              <div className="mt-3 grid gap-2">
                <Button type="submit" form="company-form" className="w-full">Save Company</Button>
                <Button type="submit" form="company-logo-upload-form" variant="outline" className="w-full">Upload Logo</Button>
                {company.logo_url ? <Button type="submit" form="company-logo-remove-form" variant="ghost" className="w-full">Remove Logo</Button> : null}
              </div>
            </section>
            <section className="rounded-lg border bg-card p-3 shadow-sm">
              <h2 className="text-[13px] font-semibold">Profile Summary</h2>
              <div className="mt-3 grid gap-2 text-xs">
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Code</span><strong>{company.company_code}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Status</span><strong>{company.status}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Logo</span><strong>{company.logo_url ? "Uploaded" : "Missing"}</strong></div>
              </div>
            </section>
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
