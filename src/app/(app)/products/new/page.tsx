import { ProductForm } from "@/components/product-form";
import { PageHeader } from "@/components/ui/page-header";
import { createProduct } from "@/server/actions/products";

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ barcode?: string }> }) {
  const params = await searchParams;
  return (
    <>
      <PageHeader title="New Product" description="Create a finished product master record." />
      <div className="p-5">
        <ProductForm initialBarcode={params.barcode} action={createProduct} />
      </div>
    </>
  );
}
