import { ProductForm } from "@/components/product-form";
import { PageHeader } from "@/components/ui/page-header";
import { createProduct } from "@/server/actions/products";

export default function NewProductPage() {
  return (
    <>
      <PageHeader title="New Product" description="Create a finished product master record." />
      <div className="p-5">
        <ProductForm action={createProduct} />
      </div>
    </>
  );
}
