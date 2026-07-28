import { UomConversionForm } from "@/components/master-data-forms";
import { RecordActionPanel, RecordWorkspace } from "@/components/record-workspace";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { createUomConversion } from "@/server/actions/master-data";

export default function NewUomConversionPage() {
  const formId = "uom-conversion-create-form";
  return (
    <>
      <PageHeader title="New UOM Conversion" description="Create a reusable unit conversion factor." />
      <RecordWorkspace actionPanel={<RecordActionPanel title="Conversion Actions" description="Create a reusable conversion factor."><Button type="submit" form={formId} className="w-full" data-mobile-primary-action>Create conversion</Button></RecordActionPanel>}>
        <UomConversionForm formId={formId} showSubmit={false} action={createUomConversion} />
      </RecordWorkspace>
    </>
  );
}
