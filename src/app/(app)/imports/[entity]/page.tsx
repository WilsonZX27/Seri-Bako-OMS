import { notFound } from "next/navigation";
import { ImportWorkflow } from "@/components/imports/import-workflow";
import { PageHeader } from "@/components/ui/page-header";

const labels = {
  items: "Items",
  products: "Products",
  suppliers: "Suppliers",
  "supplier-items": "Supplier Items",
} as const;

type ImportEntity = keyof typeof labels;

export default async function ImportPage({ params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params;
  if (!(entity in labels)) notFound();
  const typedEntity = entity as ImportEntity;

  return (
    <>
      <PageHeader title={`Import ${labels[typedEntity]}`} description="Upload, preview, validate, and import only clean rows." />
      <div className="p-5">
        <ImportWorkflow entity={typedEntity} />
      </div>
    </>
  );
}
