import { UomConversionForm } from "@/components/master-data-forms";
import { RecordActionPanel, RecordWorkspace } from "@/components/record-workspace";
import { SubmitButton } from "@/components/ui/submit-button";
import { PageHeader } from "@/components/ui/page-header";
import { createUomConversion } from "@/server/actions/master-data";

export default function NewUomConversionPage() {
  const formId = "uom-conversion-create-form";
  return (
    <>
      <PageHeader title="New UOM Conversion" description="Create a reusable unit conversion factor." />
      <RecordWorkspace actionPanel={<RecordActionPanel title="Conversion Actions" description="Create a reusable conversion factor."><SubmitButton type="submit" form={formId} className="w-full" pendingLabel="Creating..." data-mobile-primary-action>Create conversion</SubmitButton></RecordActionPanel>}>
        <UomConversionForm formId={formId} showSubmit={false} action={createUomConversion} />
      </RecordWorkspace>
    </>
  );
}
