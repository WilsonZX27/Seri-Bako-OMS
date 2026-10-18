import { dailyTrackingLabels, dailyTracking } from "@/lib/daily-product-tracking";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { normalizeUom, uomOptionsWithCurrent } from "@/lib/uom";
import type { Database } from "@/types/database";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Packaging = Database["public"]["Tables"]["product_packaging"]["Row"];

type ProductFormProps = {
  product?: Product;
  packaging?: Packaging[];
  action: (formData: FormData) => Promise<void>;
  formId?: string;
  showSubmit?: boolean;
};

export function ProductForm({ product, packaging = [], action, formId, showSubmit = true }: ProductFormProps) {
  const primaryPackaging = packaging[0];
  return (
    <Card className="border-0 bg-transparent shadow-none md:border md:bg-card md:shadow-sm" data-product-setup>
      <CardContent className="p-3 md:p-5">
        <form id={formId} action={action} className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2">
          <Field label="Product Code">
            <Input name="product_code" defaultValue={product?.product_code ?? ""} required />
          </Field>
          <Field label="Product Name" className="col-span-2 sm:col-span-1">
            <Input name="product_name" defaultValue={product?.product_name ?? ""} required />
          </Field>
          <Field label="Category" className="col-span-2 sm:col-span-1">
            <Input name="category" defaultValue={product?.category ?? ""} placeholder="Frozen Pastry" required />
          </Field>
          <Field label="Daily record category" className="col-span-2">
            <SelectNative name="daily_tracking" defaultValue={product ? dailyTracking(product) : "food_daily"}>{Object.entries(dailyTrackingLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</SelectNative>
            <p className="mt-1 text-xs text-muted-foreground">Next day includes food kept for several days. Usage is recorded separately from wastage; this does not set a fixed expiry date.</p>
          </Field>
          <Field label="Display Order">
            <Input name="display_order" type="number" min="1" step="1" defaultValue={product?.display_order ?? 9999} required />
          </Field>
          <Field label="Selling Unit">
            <SelectNative name="selling_unit" defaultValue={normalizeUom(product?.selling_unit) || "PCS"} required>
              {uomOptionsWithCurrent(product?.selling_unit).map((uom) => <option key={uom} value={uom}>{uom}</option>)}
            </SelectNative>
          </Field>
          <input type="hidden" name="status" value={product?.status ?? "active"} />
          <Field label="Product Image" className="col-span-2">
            <Input name="product_image" aria-label="Product image" type="file" accept="image/png,image/jpeg,image/webp" />
            <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, or WEBP, up to 2MB.</p>
          </Field>
          <div className="col-span-2 grid grid-cols-2 gap-3 border-y py-4 sm:gap-4 md:rounded-[var(--sb-control-radius)] md:border md:bg-secondary/30 md:p-4 xl:grid-cols-4">
            <div className="col-span-2 xl:col-span-4">
              <p className="text-sm font-semibold">Packaging & Pricing</p>
              <p className="mt-1 text-xs text-muted-foreground">Default selling pack used for catalogue and future order pricing.</p>
            </div>
            <Field label="Packaging Name" className="col-span-2 sm:col-span-1">
              <Input name="packaging_name" defaultValue={primaryPackaging?.packaging_name ?? "Default Pack"} />
            </Field>
            <Field label="Selling UOM">
              <SelectNative name="packaging_selling_uom" defaultValue={normalizeUom(primaryPackaging?.selling_uom ?? product?.selling_unit) || "PCS"}>
                {uomOptionsWithCurrent(primaryPackaging?.selling_uom ?? product?.selling_unit).map((uom) => <option key={uom} value={uom}>{uom}</option>)}
              </SelectNative>
            </Field>
            <Field label="Units Per Pack">
              <Input name="units_per_pack" type="number" min="0.0001" step="0.0001" defaultValue={primaryPackaging?.units_per_pack ?? 1} />
            </Field>
            <Field label="Price">
              <Input name="price" type="number" min="0" step="0.0001" defaultValue={primaryPackaging?.price ?? 0} />
            </Field>
            <input type="hidden" name="packaging_id" value={primaryPackaging?.id ?? ""} />
          </div>
          {product ? <div className="grid gap-4 border-y py-4 md:col-span-2 md:border-0 md:py-0 md:grid-cols-2">
            <div className="md:col-span-2 md:rounded-[var(--sb-control-radius)] md:border md:bg-secondary/30 md:p-4">
              <p className="text-sm font-semibold">Product Image</p>
              {product.product_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.product_image_url} alt={product.product_name} className="mt-3 aspect-video w-full rounded-[var(--sb-radius-control)] border object-cover" />
              ) : (
                <div className="mt-3 flex h-24 items-center justify-center rounded-[var(--sb-radius-control)] border bg-background text-xs text-muted-foreground">
                  No image uploaded yet
                </div>
              )}
            </div>
          </div> : null}
          {showSubmit ? <div className="flex justify-end md:col-span-2">
            <SubmitButton type="submit" pendingLabel={product ? "Saving..." : "Creating..."}>{product ? "Save product" : "Create product"}</SubmitButton>
          </div> : null}
        </form>
      </CardContent>
    </Card>
  );
}
