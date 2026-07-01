import { UomConversionForm } from "@/components/master-data-forms";
import { PageHeader } from "@/components/ui/page-header";
import { updateUomConversion } from "@/server/actions/master-data";
import { getUomConversion } from "@/server/queries/master-data";

export default async function EditUomConversionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conversion = await getUomConversion(id);
  return (
    <>
      <PageHeader title="Edit UOM Conversion" description={`${conversion.from_uom} to ${conversion.to_uom}`} />
      <div className="p-5">
        <UomConversionForm conversion={conversion} action={updateUomConversion.bind(null, id)} />
      </div>
    </>
  );
}
