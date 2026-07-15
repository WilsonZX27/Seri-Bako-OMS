"use client";

import Image from "next/image";
import { Calculator, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatNumber, getToday } from "@/lib/utils";
import type { RecipeDetail, RecipeIngredientOption } from "@/server/queries/recipes";

type ProductOption = {
  id: string;
  product_code: string;
  product_name: string;
  selling_unit: string;
  product_image_url?: string | null;
};

type RecipeFormLine = {
  ingredient_item_id: string;
  itemSearch: string;
  item_code: string;
  item_name: string;
  item_image_url: string | null;
  qty_required: number;
  recipe_uom: string;
  base_uom: string;
  conversion_factor: number;
  wastage_percent: number;
  cost_per_unit: number;
  remarks: string;
};

type RecipeFormProps = {
  recipe?: RecipeDetail;
  products: ProductOption[];
  items: RecipeIngredientOption[];
  action: (formData: FormData) => Promise<void>;
  formId?: string;
  showSubmit?: boolean;
};

function buildItemSearch(item: RecipeIngredientOption) {
  return `${item.item_code} - ${item.item_name}`;
}

function createEmptyLine(): RecipeFormLine {
  return {
    ingredient_item_id: "",
    itemSearch: "",
    item_code: "",
    item_name: "",
    item_image_url: null,
    qty_required: 1,
    recipe_uom: "",
    base_uom: "",
    conversion_factor: 1,
    wastage_percent: 0,
    cost_per_unit: 0,
    remarks: "",
  };
}

function itemFallback(label: string) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-[2px] bg-secondary text-xs font-semibold text-muted-foreground">
      {label.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function RecipeForm({ recipe, products, items, action, formId, showSubmit = true }: RecipeFormProps) {
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const itemBySearch = useMemo(() => new Map(items.map((item) => [buildItemSearch(item), item])), [items]);
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  const [productId, setProductId] = useState(recipe?.product_id ?? products[0]?.id ?? "");
  const [yieldQty, setYieldQty] = useState(Number(recipe?.yield_qty ?? 1));
  const [yieldUnit, setYieldUnit] = useState(recipe?.yield_unit ?? productById.get(productId)?.selling_unit ?? "pcs");
  const [lines, setLines] = useState<RecipeFormLine[]>(
    recipe?.lines.length
      ? recipe.lines.map((line) => {
          const item = itemById.get(line.ingredient_item_id);
          return {
            ingredient_item_id: line.ingredient_item_id,
            itemSearch: item ? buildItemSearch(item) : `${line.ingredient_item_code} - ${line.ingredient_name}`,
            item_code: line.ingredient_item_code,
            item_name: line.ingredient_name,
            item_image_url: line.ingredient_image_url,
            qty_required: Number(line.qty_required),
            recipe_uom: line.recipe_uom,
            base_uom: line.base_uom,
            conversion_factor: Number(line.conversion_factor),
            wastage_percent: Number(line.wastage_percent),
            cost_per_unit: Number(line.cost_per_unit),
            remarks: line.remarks ?? "",
          };
        })
      : [createEmptyLine()],
  );

  const selectedProduct = productById.get(productId);
  const duplicateIds = lines
    .map((line) => line.ingredient_item_id)
    .filter(Boolean)
    .filter((id, index, all) => all.indexOf(id) !== index);
  const hasDuplicate = duplicateIds.length > 0;

  const enrichedLines = lines.map((line) => {
    const baseQtyRequired = Number(line.qty_required) * Number(line.conversion_factor || 1);
    const lineCostBeforeWastage = Number(line.cost_per_unit) * baseQtyRequired;
    const calculatedLineCost = lineCostBeforeWastage * (1 + Number(line.wastage_percent) / 100);
    return { ...line, base_qty_required: baseQtyRequired, line_cost_before_wastage: lineCostBeforeWastage, calculated_line_cost: calculatedLineCost };
  });

  const totalIngredientCost = enrichedLines.reduce((sum, line) => sum + line.line_cost_before_wastage, 0);
  const wastageAdjustedCost = enrichedLines.reduce((sum, line) => sum + line.calculated_line_cost, 0);
  const costPerFinishedUnit = wastageAdjustedCost / Math.max(Number(yieldQty || 1), 1);
  const firstPack = recipe?.packaging[0];
  const costPerPack = firstPack ? costPerFinishedUnit * Number(firstPack.units_per_pack) : null;

  function updateLine(index: number, patch: Partial<RecipeFormLine>) {
    setLines((current) => current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)));
  }

  function selectItem(index: number, itemSearch: string) {
    const item = itemBySearch.get(itemSearch);
    updateLine(index, {
      itemSearch,
      ingredient_item_id: item?.id ?? "",
      item_code: item?.item_code ?? "",
      item_name: item?.item_name ?? "",
      item_image_url: item?.item_image_url ?? null,
      recipe_uom: item?.base_unit ?? "",
      base_uom: item?.base_unit ?? "",
      conversion_factor: 1,
      cost_per_unit: item?.cost ?? 0,
    });
  }

  return (
    <form id={formId} action={action} className="space-y-5">
      <input
        type="hidden"
        name="lines_json"
        value={JSON.stringify(
          enrichedLines.map(({ ingredient_item_id, qty_required, recipe_uom, base_uom, conversion_factor, base_qty_required, wastage_percent, cost_per_unit, remarks }) => ({
            ingredient_item_id,
            qty_required,
            recipe_uom,
            base_uom,
            conversion_factor,
            base_qty_required,
            wastage_percent,
            cost_per_unit,
            remarks,
          })),
        )}
      />

      <Card>
        <CardHeader>
          <CardTitle>Recipe Header</CardTitle>
          <CardDescription>Manage the finished product, version, yield, and approval readiness.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <Field label="Recipe No">
            <Input name="recipe_no" defaultValue={recipe?.recipe_no ?? `RCP-${getToday().replaceAll("-", "")}-NEW`} required />
          </Field>
          <Field label="Product">
            <SelectNative
              name="product_id"
              value={productId}
              required
              onChange={(event) => {
                const nextProduct = productById.get(event.target.value);
                setProductId(event.target.value);
                setYieldUnit(nextProduct?.selling_unit ?? yieldUnit);
              }}
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.product_code} - {product.product_name}
                </option>
              ))}
            </SelectNative>
          </Field>
          <Field label="Product Code">
            <Input value={selectedProduct?.product_code ?? ""} readOnly />
          </Field>
          <Field label="Version">
            <Input name="version" type="number" min="1" defaultValue={recipe?.version ?? 1} required />
          </Field>
          <Field label="Yield Qty">
            <Input name="yield_qty" type="number" step="0.0001" min="0.0001" value={yieldQty} onChange={(event) => setYieldQty(Number(event.target.value))} required />
          </Field>
          <Field label="Yield UOM">
            <Input name="yield_unit" value={yieldUnit} onChange={(event) => setYieldUnit(event.target.value)} required />
          </Field>
          <Field label="Status">
            <SelectNative name="status" defaultValue={recipe?.status ?? "draft"}>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="active">Active</option>
              <option value="rejected">Rejected</option>
              <option value="archived">Archived</option>
            </SelectNative>
          </Field>
          <Field label="Approval">
            <SelectNative name="approval_status" defaultValue={recipe?.approval_status ?? "draft"}>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </SelectNative>
          </Field>
          <Field label="Effective Date">
            <Input name="effective_date" type="date" defaultValue={recipe?.effective_date ?? getToday()} required />
          </Field>
          <div className="md:col-span-3">
            <Field label="Remarks">
              <Textarea name="remarks" defaultValue={recipe?.remarks ?? ""} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Ingredient Lines</CardTitle>
            <CardDescription>Search by item code or name. Costs are calculated in base stock UOM.</CardDescription>
          </div>
          <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, createEmptyLine()])}>
            <Plus className="h-4 w-4" />
            Add row
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <datalist id="recipe-ingredient-items">
            {items.map((item) => (
              <option key={item.id} value={buildItemSearch(item)} />
            ))}
          </datalist>

          <div className="overflow-x-auto rounded-[2px] border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-80">Ingredient</TableHead>
                  <TableHead className="min-w-28">Qty</TableHead>
                  <TableHead>Recipe UOM</TableHead>
                  <TableHead>Factor</TableHead>
                  <TableHead>Base Qty</TableHead>
                  <TableHead>Base UOM</TableHead>
                  <TableHead>Wastage %</TableHead>
                  <TableHead>Cost / Base</TableHead>
                  <TableHead className="text-right">Line Cost</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrichedLines.map((line, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {line.item_image_url ? (
                          <Image src={line.item_image_url} alt="" width={40} height={40} className="h-10 w-10 rounded-[2px] object-cover" />
                        ) : itemFallback(line.item_code || "IT")}
                        <div className="min-w-64 space-y-1">
                          <Input list="recipe-ingredient-items" value={line.itemSearch} placeholder="Type item code or name" onChange={(event) => selectItem(index, event.target.value)} />
                          {line.item_code ? <p className="text-xs text-muted-foreground">{line.item_code} - {line.item_name}</p> : null}
                          {line.ingredient_item_id && duplicateIds.includes(line.ingredient_item_id) ? <p className="text-xs text-destructive">Duplicate ingredient</p> : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input type="number" step="0.0001" min="0.0001" value={line.qty_required} onChange={(event) => updateLine(index, { qty_required: Number(event.target.value) })} />
                    </TableCell>
                    <TableCell>
                      <Input value={line.recipe_uom} onChange={(event) => updateLine(index, { recipe_uom: event.target.value })} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" step="0.000001" min="0.000001" value={line.conversion_factor} onChange={(event) => updateLine(index, { conversion_factor: Number(event.target.value) })} />
                    </TableCell>
                    <TableCell className="font-medium">{formatNumber(line.base_qty_required)}</TableCell>
                    <TableCell>
                      <Input value={line.base_uom} onChange={(event) => updateLine(index, { base_uom: event.target.value })} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" step="0.0001" min="0" value={line.wastage_percent} onChange={(event) => updateLine(index, { wastage_percent: Number(event.target.value) })} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" step="0.0001" min="0" value={line.cost_per_unit} onChange={(event) => updateLine(index, { cost_per_unit: Number(event.target.value) })} />
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(line.calculated_line_cost)}</TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="icon" aria-label="Remove ingredient row" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} disabled={lines.length === 1}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {hasDuplicate ? <p className="text-sm text-destructive">Duplicate ingredients are not allowed.</p> : null}

          <div className="grid gap-3 rounded-[2px] border bg-secondary/50 p-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Ingredient Cost</p>
              <p className="text-base font-semibold">{formatCurrency(totalIngredientCost)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Wastage Adjusted</p>
              <p className="text-base font-semibold">{formatCurrency(wastageAdjustedCost)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cost / Finished Unit</p>
              <p className="text-base font-semibold">{formatCurrency(costPerFinishedUnit)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cost / Pack</p>
              <p className="text-base font-semibold">{costPerPack ? formatCurrency(costPerPack) : "-"}</p>
              {firstPack ? <Badge variant="secondary">{firstPack.packaging_name}</Badge> : null}
            </div>
          </div>

          {showSubmit ? <div className="flex justify-end">
            <Button type="submit" disabled={hasDuplicate}>
              <Calculator className="h-4 w-4" />
              {recipe ? "Save recipe" : "Create recipe"}
            </Button>
          </div> : null}
        </CardContent>
      </Card>
    </form>
  );
}
