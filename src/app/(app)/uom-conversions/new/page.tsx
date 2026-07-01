import { UomConversionForm } from "@/components/master-data-forms";
import { PageHeader } from "@/components/ui/page-header";
import { createUomConversion } from "@/server/actions/master-data";

export default function NewUomConversionPage() {
  return (
    <>
      <PageHeader title="New UOM Conversion" description="Create a reusable unit conversion factor." />
      <div className="p-5">
        <UomConversionForm action={createUomConversion} />
      </div>
    </>
  );
}
