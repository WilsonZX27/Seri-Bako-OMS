import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import type { Database } from "@/types/database";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Packaging = Database["public"]["Tables"]["product_packaging"]["Row"];

type ProductFormProps = {
  product?: Product;
  packaging?: Packaging[];
  initialBarcode?: string;
  action: (formData: FormData) => Promise<void>;
};

export function ProductForm({ product, packaging = [], action }: ProductFormProps) {
  const primaryPackaging = packaging[0];
  return (
    <Card>
      <CardContent className="p-5">
        <form action={action} className="grid gap-4 md:grid-cols-2">
          <Field label="Product Code">
            <Input name="product_code" defaultValue={product?.product_code ?? ""} required />
          </Field>
          <Field label="Product Name">
            <Input name="product_name" defaultValue={product?.product_name ?? ""} required />
          </Field>
          <Field label="Category">
            <Input name="category" defaultValue={product?.category ?? ""} placeholder="Frozen Pastry" required />
          </Field>
          <Field label="Selling Unit">
            <Input name="selling_unit" defaultValue={product?.selling_unit ?? ""} placeholder="pcs" required />
          </Field>
          <Field label="Status">
            <SelectNative name="status" defaultValue={product?.status ?? "active"}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </SelectNative>
          </Field>
          <Field label="Product Image URL">
            <Input name="product_image_url" defaultValue={product?.product_image_url ?? ""} placeholder="https://..." />
          </Field>
          <div className="grid gap-4 rounded-lg border bg-secondary/30 p-4 md:col-span-2 md:grid-cols-4">
            <div className="md:col-span-4">
              <p className="text-sm font-semibold">Packaging & Pricing</p>
              <p className="mt-1 text-xs text-muted-foreground">Default selling pack used for catalogue and future order pricing.</p>
            </div>
            <Field label="Packaging Name">
              <Input name="packaging_name" defaultValue={primaryPackaging?.packaging_name ?? "Default Pack"} />
            </Field>
            <Field label="Selling UOM">
              <Input name="packaging_selling_uom" defaultValue={primaryPackaging?.selling_uom ?? product?.selling_unit ?? ""} />
            </Field>
            <Field label="Units Per Pack">
              <Input name="units_per_pack" type="number" min="0.0001" step="0.0001" defaultValue={primaryPackaging?.units_per_pack ?? 1} />
            </Field>
            <Field label="Price">
              <Input name="price" type="number" min="0" step="0.0001" defaultValue={primaryPackaging?.price ?? 0} />
            </Field>
            <input type="hidden" name="packaging_id" value={primaryPackaging?.id ?? ""} />
          </div>
          <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
            <div className="rounded-lg border bg-secondary/30 p-4">
              <p className="text-sm font-semibold">Product Image</p>
              {product?.product_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.product_image_url} alt={product.product_name} className="mt-3 aspect-video w-full rounded-md border object-cover" />
              ) : (
                <div className="mt-3 flex aspect-video items-center justify-center rounded-md border bg-background text-sm text-muted-foreground">
                  No image uploaded yet
                </div>
              )}
            </div>
            <div className="rounded-lg border bg-secondary/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Attachments</p>
                <span className="rounded-full bg-background px-2 py-1 text-xs text-muted-foreground">0 files</span>
              </div>
              <div className="mt-3 rounded-md border bg-background p-3 text-sm text-muted-foreground">
                Product photos, labels, specifications, and costing documents will appear here once shared attachments are enabled.
              </div>
            </div>
          </div>
          <div className="flex justify-end md:col-span-2">
            <Button type="submit">{product ? "Save product" : "Create product"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
