"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Calculator } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatCurrency, formatNumber, getToday } from "@/lib/utils";
import type { ProductionRecipeOption } from "@/server/queries/production-jobs";

type BranchOption = {
  id: string;
  branch_code: string;
  branch_name: string;
};

type StockBalanceOption = {
  branch_id: string | null;
  item_id: string;
  current_qty: number;
};

export function ProductionJobForm({
  branches,
  recipes,
  balances,
  action,
  formId,
  showSubmit = true,
}: {
  branches: BranchOption[];
  recipes: ProductionRecipeOption[];
  balances: StockBalanceOption[];
  action: (formData: FormData) => Promise<void>;
  formId?: string;
  showSubmit?: boolean;
}) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [recipeId, setRecipeId] = useState(recipes[0]?.id ?? "");
  const selectedRecipe = recipes.find((recipe) => recipe.id === recipeId) ?? null;
  const [plannedQty, setPlannedQty] = useState(selectedRecipe?.yield_qty ?? 1);
  const [outputUom, setOutputUom] = useState(selectedRecipe?.yield_unit ?? "PCS");
  const stockByBranchItem = useMemo(() => new Map(balances.map((row) => [`${row.branch_id}:${row.item_id}`, row.current_qty])), [balances]);

  const factor = selectedRecipe ? plannedQty / Math.max(selectedRecipe.yield_qty, 0.0001) : 1;
  const ingredientLines = selectedRecipe?.lines.map((line) => {
    const requiredQty = line.qty_per_yield * factor;
    const availableQty = stockByBranchItem.get(`${branchId}:${line.item_id}`) ?? 0;
    return {
      ...line,
      requiredQty,
      availableQty,
      lineCost: requiredQty * line.unit_cost,
      shortage: availableQty < requiredQty,
    };
  }) ?? [];
  const totalCost = ingredientLines.reduce((sum, line) => sum + line.lineCost, 0);
  const unitCost = plannedQty > 0 ? totalCost / plannedQty : 0;
  const hasShortage = ingredientLines.some((line) => line.shortage);

  return (
    <form id={formId} action={action} className="space-y-5">
      <input type="hidden" name="idempotency_key" value={idempotencyKey} />
      <Card>
        <CardHeader>
          <CardTitle>Production Details</CardTitle>
          <CardDescription>Branch-first production setup. Stock posts to the selected branch after approval.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Field label="Production Date" required>
            <Input name="production_date" type="date" defaultValue={getToday()} required />
          </Field>
          <Field label="Branch" required>
            <SelectNative name="branch_id" value={branchId} required onChange={(event) => setBranchId(event.target.value)}>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.branch_name}</option>
              ))}
            </SelectNative>
          </Field>
          <Field label="Recipe" required>
            <SelectNative
              name="recipe_id"
              value={recipeId}
              required
              onChange={(event) => {
                const recipe = recipes.find((row) => row.id === event.target.value);
                setRecipeId(event.target.value);
                if (recipe) {
                  setPlannedQty(recipe.yield_qty);
                  setOutputUom(recipe.yield_unit);
                }
              }}
            >
              {recipes.map((recipe) => (
                <option key={recipe.id} value={recipe.id}>{recipe.recipe_no} - {recipe.product_name}</option>
              ))}
            </SelectNative>
          </Field>
          <Field label="Planned Output Qty" required>
            <Input name="planned_output_qty" type="number" min="0.0001" step="0.0001" value={plannedQty} onChange={(event) => setPlannedQty(Number(event.target.value))} required />
          </Field>
          <Field label="Output UOM" required>
            <Input name="output_uom" value={outputUom} onChange={(event) => setOutputUom(event.target.value)} required />
          </Field>
          <Field label="Priority">
            <SelectNative name="priority" defaultValue="normal">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
              <option value="critical">Critical</option>
            </SelectNative>
          </Field>
          <div className="md:col-span-3">
            <Field label="Remarks">
              <Textarea name="remarks" placeholder="Optional production notes" />
            </Field>
          </div>
        </CardContent>
      </Card>

      {!recipes.length ? (
        <Card>
          <CardContent className="flex gap-3 p-4 text-xs text-warning">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p>No active recipe found. Activate a recipe before creating production job.</p>
          </CardContent>
        </Card>
      ) : null}

      {selectedRecipe ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Ingredient Snapshot</CardTitle>
              <CardDescription>Requirements are copied into the job so future recipe changes do not rewrite history.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasShortage ? (
                <div className="flex gap-2 rounded-md bg-warning/10 p-3 text-sm text-warning">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Some ingredients are below required stock. Draft can be created, but posting will be blocked unless an authorized user overrides negative stock.
                </div>
              ) : null}
              <div className="sb-table-region hidden rounded-[2px] border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingredient</TableHead>
                      <TableHead className="text-right">Required</TableHead>
                      <TableHead>UOM</TableHead>
                      <TableHead className="text-right">Branch Stock</TableHead>
                      <TableHead className="text-right">Est. Cost</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ingredientLines.map((line) => (
                      <TableRow key={line.item_id}>
                        <TableCell>
                          <p className="font-medium">{line.item_name}</p>
                          <p className="text-xs text-muted-foreground">{line.item_code}</p>
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(line.requiredQty)}</TableCell>
                        <TableCell>{line.uom}</TableCell>
                        <TableCell className="text-right">{formatNumber(line.availableQty)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(line.lineCost)}</TableCell>
                        <TableCell>{line.shortage ? <Badge variant="warning">Short</Badge> : <Badge variant="success">OK</Badge>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div data-production-ingredient-list className="divide-y divide-[var(--sb-border-soft)] md:hidden">
                {ingredientLines.map((line) => (
                  <article key={line.item_id} className="min-w-0 py-3 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold">{line.item_name}</p>
                        <p className="text-xs text-muted-foreground">{line.item_code}</p>
                      </div>
                      {line.shortage ? <Badge variant="warning">Short</Badge> : <Badge variant="success">OK</Badge>}
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div><dt className="text-muted-foreground">Required</dt><dd className="mt-0.5 font-semibold tabular-nums">{formatNumber(line.requiredQty)} {line.uom}</dd></div>
                      <div><dt className="text-muted-foreground">Branch stock</dt><dd className="mt-0.5 font-semibold tabular-nums">{formatNumber(line.availableQty)} {line.uom}</dd></div>
                      <div className="col-span-2 flex items-baseline justify-between gap-3 border-t border-[var(--sb-border-soft)] pt-2"><dt className="text-muted-foreground">Estimated cost</dt><dd className="font-semibold tabular-nums">{formatCurrency(line.lineCost)}</dd></div>
                    </dl>
                  </article>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid grid-cols-2 gap-4 p-4 md:grid-cols-4 md:p-5">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Output</p>
                <p className="font-medium">{selectedRecipe.product_name}</p>
                <p className="text-xs text-muted-foreground">{selectedRecipe.product_code}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Planned Qty</p>
                <p className="font-medium">{formatNumber(plannedQty)} {outputUom}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Est. Total Cost</p>
                <p className="font-medium">{formatCurrency(totalCost)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Est. Cost / Unit</p>
                <p className="font-medium">{formatCurrency(unitCost)}</p>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}

      {showSubmit ? <div className="flex justify-end">
        <SubmitButton type="submit" disabled={!recipes.length || !branchId || !recipeId} pendingLabel="Creating..." showOverlay overlayLabel="Creating production job...">
          <Calculator className="h-4 w-4" />
          Create draft production job
        </SubmitButton>
      </div> : null}
    </form>
  );
}
