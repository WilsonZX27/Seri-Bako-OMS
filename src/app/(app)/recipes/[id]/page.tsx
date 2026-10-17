import { RecipeVersionForm } from "@/components/recipe-form";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { DestructiveActionDialog } from "@/components/ui/destructive-action-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { RecordActionPanel, RecordWorkspace } from "@/components/record-workspace";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApprovalPanel, AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { activateRecipe, approveRecipe, archiveRecipe, createNewRecipeVersion, rejectRecipe, submitRecipe } from "@/server/actions/recipes";
import { getDocumentBundle } from "@/server/queries/documents";
import { getRecipe } from "@/server/queries/recipes";
import { formatCurrency, formatDateOnly, formatNumber } from "@/lib/utils";
import { PhaseOneDeleteAction } from "@/components/phase-one-delete-action";
import { getPermissionMap } from "@/server/auth/permissions";
import { detailOrNotFound } from "@/server/queries/detail";

function imageFallback(label: string) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-[var(--sb-control-radius)] bg-secondary text-xs font-semibold text-muted-foreground">
      {label.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default async function RecipeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { id } = await params;
  const [messageParams, recipe, permissions] = await Promise.all([searchParams, detailOrNotFound(getRecipe(id)), getPermissionMap(["recipes.create", "recipes.update", "recipes.submit", "recipes.approve", "recipes.archive"])]);
  const documentBundle = recipe.document_id ? await getDocumentBundle(recipe.document_id) : null;

  return (
    <>
      <PageHeader title={`${recipe.recipe_no} - Recipe Detail`} description={`${recipe.product_code} - ${recipe.product_name}`} />
      <RecordWorkspace
        actionPanel={
          <>
            <RecordActionPanel title="Recipe Workflow" description="Only actions valid for the current recipe state are available.">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Current status</span>
                <Badge variant={recipe.status === "active" ? "success" : recipe.status === "rejected" ? "danger" : "secondary"}>{recipe.status}</Badge>
              </div>
              {permissions["recipes.update"] && !["active", "archived"].includes(recipe.status) ? <Button asChild variant="outline" className="w-full" data-mobile-primary-action><Link href={`/recipes/${recipe.id}/edit`}>Edit Recipe</Link></Button> : null}
              {permissions["recipes.submit"] && recipe.status === "draft" ? <form action={submitRecipe.bind(null, recipe.id)}><SubmitButton type="submit" className="w-full" pendingLabel="Submitting..." data-mobile-primary-action>Submit</SubmitButton></form> : null}
              {permissions["recipes.approve"] && recipe.status === "pending_approval" ? (
                <>
                  <form action={approveRecipe.bind(null, recipe.id)}><SubmitButton type="submit" className="w-full" pendingLabel="Approving..." data-mobile-primary-action>Approve</SubmitButton></form>
                  <DestructiveActionDialog action={rejectRecipe.bind(null, recipe.id)} label="Reject Recipe" title="Reject this recipe?" description="The recipe will return to its owner for correction and cannot progress until resubmitted." pendingLabel="Rejecting..."><input name="remarks" className="h-9 w-full rounded-[var(--sb-control-radius)] border bg-background px-3 text-sm" placeholder="Rejection remarks required" required /></DestructiveActionDialog>
                </>
              ) : null}
              {permissions["recipes.approve"] && recipe.status === "approved" ? <form action={activateRecipe.bind(null, recipe.id)}><SubmitButton type="submit" className="w-full" pendingLabel="Activating..." data-mobile-primary-action>Activate</SubmitButton></form> : null}
              {permissions["recipes.create"] && recipe.status === "active" ? <RecipeVersionForm requestKey={crypto.randomUUID()} action={createNewRecipeVersion.bind(null, recipe.id)} /> : null}
              {permissions["recipes.archive"] && ["active", "approved"].includes(recipe.status) ? <DestructiveActionDialog action={archiveRecipe.bind(null, recipe.id)} label="Archive Recipe" title="Archive this recipe?" description="The recipe will leave active operational use. Its history remains available." pendingLabel="Archiving..." /> : null}
              {permissions["recipes.archive"] ? <PhaseOneDeleteAction recordType="recipe" recordId={recipe.id} label="recipe" /> : null}
            </RecordActionPanel>
            <RecordActionPanel title="Recipe Metadata">
              <dl className="grid gap-2 text-xs">
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Version</dt><dd>v{recipe.version}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Effective</dt><dd>{formatDateOnly(recipe.effective_date)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Yield</dt><dd>{formatNumber(recipe.yield_qty)} {recipe.yield_unit}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Cost / unit</dt><dd>{formatCurrency(recipe.cost_per_finished_unit)}</dd></div>
              </dl>
            </RecordActionPanel>
          </>
        }
      >
        {messageParams.error || messageParams.success ? (
          <Card>
            <CardContent className={`p-4 text-sm ${messageParams.error ? "text-destructive" : "text-[var(--sb-success)]"}`}>
              {messageParams.error ?? messageParams.success}
            </CardContent>
          </Card>
        ) : null}
        <section aria-labelledby="recipe-summary" className="overflow-hidden rounded-[var(--sb-panel-radius)] border bg-card">
          <div className="border-b px-4 py-3"><h2 id="recipe-summary" className="text-sm font-semibold">Recipe Summary</h2></div>
          <dl className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-5">
            <div className="min-w-0 px-4 py-3"><dt className="text-xs text-muted-foreground">Version</dt><dd className="mt-1 font-mono text-sm font-semibold">v{recipe.version}</dd></div>
            <div className="min-w-0 px-4 py-3"><dt className="text-xs text-muted-foreground">Yield</dt><dd className="mt-1 truncate font-mono text-sm font-semibold">{formatNumber(recipe.yield_qty)} {recipe.yield_unit}</dd></div>
            <div className="min-w-0 px-4 py-3"><dt className="text-xs text-muted-foreground">Ingredient Cost</dt><dd className="mt-1 truncate font-mono text-sm font-semibold">{formatCurrency(recipe.total_ingredient_cost)}</dd></div>
            <div className="min-w-0 px-4 py-3"><dt className="text-xs text-muted-foreground">Adjusted Cost</dt><dd className="mt-1 truncate font-mono text-sm font-semibold">{formatCurrency(recipe.wastage_adjusted_cost)}</dd></div>
            <div className="min-w-0 px-4 py-3"><dt className="text-xs text-muted-foreground">Cost / Unit</dt><dd className="mt-1 truncate font-mono text-sm font-semibold">{formatCurrency(recipe.cost_per_finished_unit)}</dd></div>
          </dl>
        </section>

        <Card>
          <CardHeader><CardTitle>Header</CardTitle></CardHeader>
          <CardContent className="grid gap-4 text-sm md:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Product</p>
              <p className="font-medium">{recipe.product_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Effective Date</p>
              <p className="font-medium">{formatDateOnly(recipe.effective_date)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <Badge variant={recipe.status === "active" ? "success" : recipe.status === "rejected" ? "danger" : "secondary"}>{recipe.status}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Approval</p>
              <Badge variant={recipe.approval_status === "approved" ? "success" : recipe.approval_status === "rejected" ? "danger" : "secondary"}>{recipe.approval_status}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Cost / Pack</p>
              <p className="font-medium">{recipe.cost_per_pack ? `${formatCurrency(recipe.cost_per_pack)} (${recipe.packaging_name})` : "-"}</p>
            </div>
            <div className="md:col-span-3">
              <p className="text-muted-foreground">Remarks</p>
              <p className="font-medium">{recipe.remarks || "-"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Ingredient Lines</CardTitle></CardHeader>
          <CardContent>
            <div data-inset-surface className="rounded-[var(--sb-panel-radius)] border">
              <Table mobileHidden aria-label="Recipe ingredient availability">
                <TableHeader>
                    <TableRow>
                      <TableHead>Ingredient</TableHead>
                      <TableHead className="text-right">Required Qty</TableHead>
                      <TableHead className="text-right">Current Stock</TableHead>
                      <TableHead className="text-right">Shortage</TableHead>
                      <TableHead>Stock Status</TableHead>
                      <TableHead>Suggested Action</TableHead>
                      <TableHead className="text-right">Line Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipe.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {line.ingredient_image_url ? <Image src={line.ingredient_image_url} alt="" width={40} height={40} className="h-10 w-10 rounded-[var(--sb-control-radius)] object-cover" /> : imageFallback(line.ingredient_item_code)}
                          <div>
                            <p className="font-medium">{line.ingredient_name}</p>
                            <p className="text-xs text-muted-foreground">{line.ingredient_item_code}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(line.base_qty_required)} {line.base_uom}</TableCell>
                      <TableCell className="text-right">{line.current_stock == null ? "Unknown" : `${formatNumber(line.current_stock)} ${line.base_uom}`}</TableCell>
                      <TableCell className="text-right">{line.shortage_qty == null ? "-" : `${formatNumber(line.shortage_qty)} ${line.base_uom}`}</TableCell>
                      <TableCell>
                        <Badge variant={line.stock_status === "available" ? "success" : line.stock_status === "short" ? "danger" : "secondary"}>{line.stock_status === "need_purchase" ? "Need Purchase" : line.stock_status}</Badge>
                      </TableCell>
                      <TableCell>{line.stock_status === "available" ? "Use stock" : line.stock_status === "unknown" ? "Check stock" : "Create PR"}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(line.calculated_line_cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="divide-y xl:hidden" role="list" aria-label="Recipe ingredient availability" data-recipe-ingredient-detail-list>
                {recipe.lines.map((line) => { const action = line.stock_status === "available" ? "Use stock" : line.stock_status === "unknown" ? "Check stock" : "Create PR"; return <article key={line.id} className="space-y-3 p-3" role="listitem"><div className="flex items-start gap-3">{line.ingredient_image_url ? <Image src={line.ingredient_image_url} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-[var(--sb-control-radius)] object-cover" /> : imageFallback(line.ingredient_item_code)}<div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-medium leading-snug">{line.ingredient_name}</h3><p className="text-xs text-muted-foreground">{line.ingredient_item_code}</p></div><strong className="shrink-0">{formatNumber(line.base_qty_required)} {line.base_uom}</strong></div></div></div><dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-md bg-secondary/35 p-3 text-xs"><div><dt className="text-muted-foreground">Current stock</dt><dd className="mt-1 font-medium">{line.current_stock == null ? "Unknown" : `${formatNumber(line.current_stock)} ${line.base_uom}`}</dd></div><div><dt className="text-muted-foreground">Shortage</dt><dd className="mt-1 font-medium">{line.shortage_qty == null ? "Unavailable" : `${formatNumber(line.shortage_qty)} ${line.base_uom}`}</dd></div><div><dt className="text-muted-foreground">Suggested action</dt><dd className="mt-1 font-medium">{action}</dd></div><div><dt className="text-muted-foreground">Line cost</dt><dd className="mt-1 font-medium">{formatCurrency(line.calculated_line_cost)}</dd></div></dl><Badge variant={line.stock_status === "available" ? "success" : line.stock_status === "short" ? "danger" : "secondary"}>{line.stock_status === "need_purchase" ? "Need Purchase" : line.stock_status}</Badge></article>; })}
              </div>
            </div>
          </CardContent>
        </Card>

        {documentBundle ? (
          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <DocumentTimeline document={documentBundle.document} activities={documentBundle.activityLogs} comments={documentBundle.comments} attachments={documentBundle.attachments} />
              <AttachmentPanel documentId={documentBundle.document.id} attachments={documentBundle.attachments} />
              <CommentsPanel documentId={documentBundle.document.id} comments={documentBundle.comments} />
            </div>
            <div className="space-y-5">
              <ApprovalPanel document={documentBundle.document} approval={documentBundle.approval} approvalSteps={documentBundle.approvalSteps} />
              <RevisionPanel revisions={documentBundle.revisions} />
            </div>
          </div>
        ) : null}
      </RecordWorkspace>
    </>
  );
}
