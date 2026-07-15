import { ProductForm } from "@/components/product-form";
import { PageHeader } from "@/components/ui/page-header";
import { updateProduct } from "@/server/actions/products";
import { getProduct, getProductPackaging } from "@/server/queries/products";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, packaging] = await Promise.all([getProduct(id), getProductPackaging(id)]);
  const formId = "product-edit-form";

  return (
    <>
      <PageHeader title="Edit Product" description={product.product_name} />
      <WorkspaceGrid rightRail={<ConsoleSection title="Actions"><SubmitButton form={formId} type="submit" className="w-full" data-mobile-primary-action>Save product</SubmitButton></ConsoleSection>}>
        <ProductForm formId={formId} showSubmit={false} product={product} packaging={packaging} action={updateProduct.bind(null, id)} />
      </WorkspaceGrid>
    </>
  );
}
