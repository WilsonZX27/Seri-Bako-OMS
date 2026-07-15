import { ProductForm } from "@/components/product-form";
import { PageHeader } from "@/components/ui/page-header";
import { createProduct } from "@/server/actions/products";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { SubmitButton } from "@/components/ui/submit-button";

export default function NewProductPage() {
  const formId = "product-create-form";
  return (
    <>
      <PageHeader title="New Product" description="Create a finished product master record." />
      <WorkspaceGrid rightRail={<ConsoleSection title="Actions"><SubmitButton form={formId} type="submit" className="w-full" data-mobile-primary-action>Create product</SubmitButton></ConsoleSection>}>
        <ProductForm formId={formId} showSubmit={false} action={createProduct} />
      </WorkspaceGrid>
    </>
  );
}
