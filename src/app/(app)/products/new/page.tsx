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
      <WorkspaceGrid documentMode tabletRailMode="split" rightRail={<>
        <ConsoleSection title="Primary Action"><SubmitButton form={formId} type="submit" className="w-full" data-mobile-primary-action>Create product</SubmitButton></ConsoleSection>
        <ConsoleSection title="Product Setup"><div className="space-y-2 text-xs text-muted-foreground"><p>Product code and name identify the finished good.</p><p>Selling and packaging units use controlled UOM values.</p><p>The product starts active; lifecycle changes happen after creation.</p></div></ConsoleSection>
      </>}>
        <ProductForm formId={formId} showSubmit={false} action={createProduct} />
      </WorkspaceGrid>
    </>
  );
}
