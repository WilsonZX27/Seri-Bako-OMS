import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApprovalPanel, AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { activateRecipe, approveRecipe, archiveRecipe, createNewRecipeVersion, rejectRecipe, submitRecipe } from "@/server/actions/recipes";
import { getDocumentBundle } from "@/server/queries/documents";
import { getRecipe } from "@/server/queries/recipes";
import { formatCurrency, formatNumber } from "@/lib/utils";

function imageFallback(label: string) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-muted-foreground">
      {label.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  const documentBundle = recipe.document_id ? await getDocumentBundle(recipe.document_id) : null;

  return (
    <>
      <PageHeader title={`${recipe.recipe_no} - Recipe Detail`} description={`${recipe.product_code} - ${recipe.product_name}`} />
      <div className="space-y-5 p-5">
        <div className="flex flex-wrap justify-end gap-2">
          {recipe.status !== "active" && recipe.status !== "archived" ? (
            <Button asChild variant="outline"><Link href={`/recipes/${recipe.id}/edit`}>Edit recipe</Link></Button>
          ) : null}
          <form action={submitRecipe.bind(null, recipe.id)}><Button type="submit" variant="secondary" disabled={recipe.status !== "draft"}>Submit</Button></form>
          <form action={approveRecipe.bind(null, recipe.id)}><Button type="submit" variant="outline" disabled={recipe.status !== "pending_approval"}>Approve</Button></form>
          <form action={activateRecipe.bind(null, recipe.id)}><Button type="submit" disabled={recipe.status !== "approved"}>Activate</Button></form>
          <form action={createNewRecipeVersion.bind(null, recipe.id)}><Button type="submit" variant="outline" disabled={recipe.status !== "active"}>New version</Button></form>
          <form action={archiveRecipe.bind(null, recipe.id)}><Button type="submit" variant="ghost" disabled={!["active", "approved"].includes(recipe.status)}>Archive</Button></form>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader><CardTitle>Version</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">v{recipe.version}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Yield</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{formatNumber(recipe.yield_qty)} {recipe.yield_unit}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Ingredient Cost</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{formatCurrency(recipe.total_ingredient_cost)}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Adjusted Cost</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{formatCurrency(recipe.wastage_adjusted_cost)}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Cost / Unit</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{formatCurrency(recipe.cost_per_finished_unit)}</CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Header</CardTitle></CardHeader>
          <CardContent className="grid gap-4 text-sm md:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Product</p>
              <p className="font-medium">{recipe.product_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Effective Date</p>
              <p className="font-medium">{recipe.effective_date}</p>
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

        {recipe.status === "pending_approval" ? (
          <Card>
            <CardContent className="space-y-3 p-5">
              <p className="text-sm font-semibold">Reject Recipe</p>
              <form action={rejectRecipe.bind(null, recipe.id)} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <input name="remarks" className="h-10 rounded-md border bg-background px-3 text-sm" placeholder="Rejection remarks required" required />
                <Button type="submit" variant="destructive">Confirm reject</Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader><CardTitle>Ingredient Lines</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead className="text-right">Recipe Qty</TableHead>
                    <TableHead>Recipe UOM</TableHead>
                    <TableHead className="text-right">Factor</TableHead>
                    <TableHead className="text-right">Base Qty</TableHead>
                    <TableHead>Base UOM</TableHead>
                    <TableHead className="text-right">Wastage %</TableHead>
                    <TableHead className="text-right">Cost / Base</TableHead>
                    <TableHead className="text-right">Line Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipe.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {line.ingredient_image_url ? <Image src={line.ingredient_image_url} alt="" width={40} height={40} className="h-10 w-10 rounded-md object-cover" /> : imageFallback(line.ingredient_item_code)}
                          <div>
                            <p className="font-medium">{line.ingredient_name}</p>
                            <p className="text-xs text-muted-foreground">{line.ingredient_item_code}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{line.barcode ?? "-"}</TableCell>
                      <TableCell className="text-right">{formatNumber(line.qty_required)}</TableCell>
                      <TableCell>{line.recipe_uom}</TableCell>
                      <TableCell className="text-right">{formatNumber(line.conversion_factor)}</TableCell>
                      <TableCell className="text-right">{formatNumber(line.base_qty_required)}</TableCell>
                      <TableCell>{line.base_uom}</TableCell>
                      <TableCell className="text-right">{formatNumber(line.wastage_percent)}%</TableCell>
                      <TableCell className="text-right">{formatCurrency(line.cost_per_unit)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(line.calculated_line_cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
      </div>
    </>
  );
}
