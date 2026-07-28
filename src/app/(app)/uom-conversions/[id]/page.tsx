import { UomConversionForm } from "@/components/master-data-forms";
import { RecordActionPanel, RecordWorkspace } from "@/components/record-workspace";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { updateUomConversion } from "@/server/actions/master-data";
import { getUomConversion } from "@/server/queries/master-data";

export default async function EditUomConversionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conversion = await getUomConversion(id);
  const formId = "uom-conversion-edit-form";
  return (
    <>
      <PageHeader title="Edit UOM Conversion" description={`${conversion.from_uom} to ${conversion.to_uom}`} />
      <RecordWorkspace actionPanel={<RecordActionPanel title="Conversion Actions" description="Save this reusable conversion factor."><Button type="submit" form={formId} className="w-full" data-mobile-primary-action>Save conversion</Button></RecordActionPanel>}>
        <UomConversionForm formId={formId} showSubmit={false} conversion={conversion} action={updateUomConversion.bind(null, id)} />
      </RecordWorkspace>
    </>
  );
}
