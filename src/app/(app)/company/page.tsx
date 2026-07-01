import { CompanyForm } from "@/components/foundation-forms";
import { PageHeader } from "@/components/ui/page-header";
import { updateCompany } from "@/server/actions/foundation";
import { getCompany } from "@/server/queries/foundation";

export default async function CompanyPage() {
  const company = await getCompany();

  return (
    <>
      <PageHeader title="Company" description="Legal company profile and central Seri Bako identity." />
      <div className="p-5">
        <CompanyForm company={company} action={updateCompany.bind(null, company.id)} />
      </div>
    </>
  );
}
