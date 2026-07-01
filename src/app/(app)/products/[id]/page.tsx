import { ProductForm } from "@/components/product-form";
import { PageHeader } from "@/components/ui/page-header";
import { updateProduct } from "@/server/actions/products";
import { getProduct, getProductPackaging } from "@/server/queries/products";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, packaging] = await Promise.all([getProduct(id), getProductPackaging(id)]);

  return (
    <>
      <PageHeader title="Edit Product" description={product.product_name} />
      <div className="p-5">
        <ProductForm product={product} packaging={packaging} action={updateProduct.bind(null, id)} />
      </div>
    </>
  );
}
