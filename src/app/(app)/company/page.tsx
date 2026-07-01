import { CompanyForm } from "@/components/foundation-forms";
import { CompanyLogoForm } from "@/components/company-logo-form";
import { PageHeader } from "@/components/ui/page-header";
import { removeCompanyLogo, updateCompany, updateCompanyLogo } from "@/server/actions/foundation";
import { getCompany } from "@/server/queries/foundation";

export default async function CompanyPage({
  searchParams,
}: {
  searchParams: Promise<{ logoError?: string }>;
}) {
  const params = await searchParams;
  const company = await getCompany();

  return (
    <>
      <PageHeader title="Company" description="Legal company profile and central Seri Bako identity." />
      <div className="grid gap-5 p-5">
        <CompanyLogoForm
          companyId={company.id}
          logoUrl={company.logo_url}
          logoError={params.logoError}
          uploadAction={updateCompanyLogo.bind(null, company.id)}
          removeAction={removeCompanyLogo.bind(null, company.id)}
        />
        <CompanyForm company={company} action={updateCompany.bind(null, company.id)} />
      </div>
    </>
  );
}
