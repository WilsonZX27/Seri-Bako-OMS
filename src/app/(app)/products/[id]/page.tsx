import { ProductForm } from "@/components/product-form";
import { PageHeader } from "@/components/ui/page-header";
import { updateProduct } from "@/server/actions/products";
import { getProduct, getProductPackaging } from "@/server/queries/products";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { DangerConfirmForm } from "@/components/ui/danger-confirm-form";
import { deleteProduct, restoreProduct } from "@/server/actions/products";
import { PhaseOneDeleteAction } from "@/components/phase-one-delete-action";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, packaging] = await Promise.all([getProduct(id), getProductPackaging(id)]);
  const formId = "product-edit-form";

  return (
    <>
      <PageHeader title="Edit Product" description={product.product_name} />
      <WorkspaceGrid documentMode rightRail={<><ConsoleSection title="Primary Action"><SubmitButton form={formId} type="submit" className="w-full" data-mobile-primary-action>Save product</SubmitButton></ConsoleSection><ConsoleSection title="More Options"><PhaseOneDeleteAction recordType="product" recordId={id} label="product" />{product.status === "inactive" ? <form action={restoreProduct.bind(null, id)}><Button type="submit" className="w-full">Restore product</Button></form> : <DangerConfirmForm action={deleteProduct.bind(null, id)} title={`Deactivate ${product.product_name}?`} description="The product will leave active selection lists. Existing recipes and production history remain intact." warning="Products referenced by operational records are deactivated, never physically deleted." checkboxLabel="I understand this product will not be available for new work." confirmWord="DEACTIVATE" buttonLabel="Deactivate product" pendingLabel="Deactivating..." />}</ConsoleSection></> }>
        <ProductForm formId={formId} showSubmit={false} product={product} packaging={packaging} action={updateProduct.bind(null, id)} />
      </WorkspaceGrid>
    </>
  );
}
