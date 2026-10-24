"use client";

import { useActionState } from "react";
import { dailyTrackingLabels, dailyTracking } from "@/lib/daily-product-tracking";
import { FormPendingBridge, SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectControl } from "@/components/ui/select-control";
import { ProductCategoryCombobox } from "@/components/product-category-combobox";
import { normalizeUom, uomOptionsWithCurrent } from "@/lib/uom";
import type { Database } from "@/types/database";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Packaging = Database["public"]["Tables"]["product_packaging"]["Row"];

type ProductFormProps = {
  product?: Product;
  packaging?: Packaging[];
  action: (formData: FormData) => Promise<void | { error: string }>;
  formId?: string;
  showSubmit?: boolean;
  categories?: string[];
};

export function ProductForm({ product, packaging = [], action, formId, showSubmit = true, categories = [] }: ProductFormProps) {
  const primaryPackaging = packaging[0];
  const [state, submitAction] = useActionState(async (_previous: { error: string; values: FormData | null }, data: FormData) => {
    const result = await action(data);
    return { error: result?.error ?? "", values: result?.error ? data : null };
  }, { error: "", values: null });
  const value = (name: string, fallback: string | number) => String(state.values?.get(name) ?? fallback);
  return (
    <Card className="border-0 bg-transparent shadow-none md:border md:bg-card md:shadow-sm" data-product-setup>
      <CardContent className="p-3 md:p-5">
        <form id={formId} action={submitAction} className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2">
      {formId ? <FormPendingBridge formId={formId} /> : null}
          {state.error ? <p role="alert" className="col-span-2 rounded-lg border border-destructive p-3 text-sm text-destructive">{state.error}</p> : null}
          <Field label="Product Code">
            <Input name="product_code" defaultValue={value("product_code", product?.product_code ?? "")} required />
          </Field>
          <Field label="Product Name" className="col-span-2 sm:col-span-1">
            <Input name="product_name" defaultValue={value("product_name", product?.product_name ?? "")} required />
          </Field>
          <Field label="Category" className="col-span-2 sm:col-span-1">
            <ProductCategoryCombobox categories={categories} initialValue={product?.category ?? ""} />
            <p className="mt-1 text-xs text-muted-foreground">Choose a saved category or type a new one.</p>
          </Field>
          <Field label="Daily record category" className="col-span-2 sm:col-span-1">
            <SelectControl name="daily_tracking" defaultValue={value("daily_tracking", product ? dailyTracking(product) : "food_daily")} ariaLabel={"Daily record category"} options={[...(Object.entries(dailyTrackingLabels).map(([value,label])=>({value: String((value) ?? ""), label: String((label) ?? "")})))]}/>
            <p className="mt-1 text-xs text-muted-foreground">Next day includes food kept for several days. Usage is recorded separately from wastage; this does not set a fixed expiry date.</p>
          </Field>
          <Field label="Product status">
            <SelectControl name="status" defaultValue={value("status", product?.status ?? "active")} required ariaLabel={"Product status"} options={[({value: "active", label: "Active"}), ({value: "inactive", label: "Inactive"})]}/>
          </Field>
          <Field label="Availability type">
            <SelectControl name="is_seasonal" defaultValue={value("is_seasonal", product?.is_seasonal ? "true" : "false")} ariaLabel={"Availability type"} options={[({value: "false", label: "Year-round"}), ({value: "true", label: "Seasonal"})]}/>
          </Field>
          <Field label="Available from"><Input name="available_from" type="date" defaultValue={value("available_from", product?.available_from ?? "")} /></Field>
          <Field label="Available until"><Input name="available_until" type="date" defaultValue={value("available_until", product?.available_until ?? "")} /></Field>
          <p className="col-span-2 -mt-2 text-xs text-muted-foreground">Seasonal items with an end date stop appearing on new Outlet Daily Records after that date. Leave dates blank to keep the item available until you update its season.</p>
          <Field label="Display Order">
            <Input name="display_order" type="number" min="1" step="1" defaultValue={value("display_order", product?.display_order ?? 9999)} required />
          </Field>
          <Field label="Selling Unit">
            <SelectControl name="selling_unit" defaultValue={value("selling_unit", normalizeUom(product?.selling_unit) || "PCS")} required ariaLabel={"Selling Unit"} options={[...(uomOptionsWithCurrent(product?.selling_unit).map((uom) => ({value: String((uom) ?? ""), label: String((uom) ?? "")})))]}/>
          </Field>
          <div className="col-span-2 grid grid-cols-2 gap-3 border-y py-4 sm:gap-4 md:rounded-[var(--sb-control-radius)] md:border md:bg-secondary/30 md:p-4 xl:grid-cols-4">
            <div className="col-span-2 xl:col-span-4">
              <p className="text-sm font-semibold">Packaging & Pricing</p>
              <p className="mt-1 text-xs text-muted-foreground">Default selling pack used for catalogue and future order pricing.</p>
            </div>
            <Field label="Packaging Name" className="col-span-2 sm:col-span-1">
              <Input name="packaging_name" defaultValue={value("packaging_name", primaryPackaging?.packaging_name ?? "Default Pack")} />
            </Field>
            <Field label="Selling UOM">
              <SelectControl name="packaging_selling_uom" defaultValue={value("packaging_selling_uom", normalizeUom(primaryPackaging?.selling_uom ?? product?.selling_unit) || "PCS")} ariaLabel={"Selling UOM"} options={[...(uomOptionsWithCurrent(primaryPackaging?.selling_uom ?? product?.selling_unit).map((uom) => ({value: String((uom) ?? ""), label: String((uom) ?? "")})))]}/>
            </Field>
            <Field label="Units Per Pack">
              <Input name="units_per_pack" type="number" min="0.0001" step="0.0001" defaultValue={value("units_per_pack", primaryPackaging?.units_per_pack ?? 1)} />
            </Field>
            <Field label="Price">
              <Input name="price" type="number" min="0" step="0.0001" defaultValue={value("price", primaryPackaging?.price ?? 0)} />
            </Field>
            <input type="hidden" name="packaging_id" value={primaryPackaging?.id ?? ""} />
          </div>
          <div className="col-span-2 rounded-[var(--sb-control-radius)] border bg-secondary/30 p-3 md:col-span-1 md:col-start-2 md:p-4">
              <p className="text-sm font-semibold">Product Image</p>
              {product?.product_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.product_image_url} alt={product.product_name} className="mt-3 h-24 w-full rounded-[var(--sb-radius-control)] border object-contain" />
              ) : (
                <div className="mt-3 flex h-24 items-center justify-center rounded-[var(--sb-radius-control)] border bg-background text-xs text-muted-foreground">
                  No image uploaded yet
                </div>
              )}
              <Input name="product_image" aria-label="Product image" type="file" accept="image/png,image/jpeg,image/webp" className="mt-3" />
              <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, or WEBP, up to 2MB.</p>
          </div>
          {showSubmit ? <div className="flex justify-end md:col-span-2">
            <SubmitButton type="submit" pendingLabel={product ? "Saving..." : "Creating..."}>{product ? "Save product" : "Create product"}</SubmitButton>
          </div> : null}
        </form>
      </CardContent>
    </Card>
  );
}
