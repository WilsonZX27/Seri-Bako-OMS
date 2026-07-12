import { DocumentActionBar, DocumentActionForm, DocumentActionLink } from "@/components/document-action-bar";
import { AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { cancelPurchaseReturn, postPurchaseReturn } from "@/server/actions/purchase-returns";
import { getPermissionMap } from "@/server/auth/permissions";
import { getDocumentBundle } from "@/server/queries/documents";
import { getPurchaseReturn } from "@/server/queries/purchase-returns";

const steps = [
  { key: "draft", label: "Draft", description: "Return is being prepared." },
  { key: "posted", label: "Posted", description: "Stock has been deducted." },
  { key: "cancelled", label: "Cancelled", description: "Return was cancelled before posting." },
];

export default async function PurchaseReturnDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const [{ id }, filters] = await Promise.all([params, searchParams]);
  const [{ purchaseReturn, lines, stockTransactions }, permissions] = await Promise.all([
    getPurchaseReturn(id),
    getPermissionMap(["purchase_return.post", "purchase_return.cancel"]),
  ]);
  const documentBundle = purchaseReturn.document_id ? await getDocumentBundle(purchaseReturn.document_id) : null;
  const totalValue = lines.reduce((sum, line) => sum + Number(line.return_qty) * Number(line.unit_cost), 0);
  const canPost = permissions["purchase_return.post"] && purchaseReturn.status === "draft";
  const canCancel = permissions["purchase_return.cancel"] && purchaseReturn.status === "draft";

  return (
    <DocumentWorkspace
      breadcrumbs={[{ label: "Procurement", href: "/procurement" }, { label: "Purchase Returns", href: "/purchase-returns" }, { label: purchaseReturn.purchase_return_no }]}
      documentNo={purchaseReturn.purchase_return_no}
      title="Purchase Return"
      status={purchaseReturn.status}
      workflowSteps={steps}
      currentStatus={purchaseReturn.status}
      sidePanel={
        <>
          <DocumentSideSection title="Primary Action" description="Post after supplier return quantity is checked. Posting deducts stock once.">
            <DocumentActionBar>
              <DocumentActionLink href={`/goods-receivings/${purchaseReturn.goods_receiving_id}`} variant="outline">View GRN</DocumentActionLink>
              {canPost ? <DocumentActionForm action={postPurchaseReturn.bind(null, purchaseReturn.id)} pendingLabel="Posting...">Post return</DocumentActionForm> : null}
              {canCancel ? <DocumentActionForm action={cancelPurchaseReturn.bind(null, purchaseReturn.id)} pendingLabel="Cancelling..." variant="destructive">Cancel draft</DocumentActionForm> : null}
            </DocumentActionBar>
            {filters.error ? <p className="mt-3 text-sm text-destructive">{filters.error}</p> : null}
          </DocumentSideSection>
          <DocumentSideSection title="Stock Ledger">
            <div className="grid gap-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Ledger Rows</span><strong>{stockTransactions.filter((row) => row.reference_id === purchaseReturn.id).length}</strong></div>
              {stockTransactions.filter((row) => row.reference_id === purchaseReturn.id).map((row) => (
                <div key={row.id} className="rounded-md border p-2">
                  <p className="font-medium">{row.transaction_no}</p>
                  <p className="text-muted-foreground">{row.transaction_type} · Out {formatNumber(Number(row.quantity_out))}</p>
                </div>
              ))}
            </div>
          </DocumentSideSection>
          {documentBundle ? (
            <>
              <CommentsPanel documentId={documentBundle.document.id} comments={documentBundle.comments} />
              <AttachmentPanel documentId={documentBundle.document.id} attachments={documentBundle.attachments} />
              <DocumentTimeline document={documentBundle.document} activities={documentBundle.activityLogs} comments={documentBundle.comments} attachments={documentBundle.attachments} />
              <RevisionPanel revisions={documentBundle.revisions} />
            </>
          ) : null}
        </>
      }
    >
      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="text-sm font-semibold">Return Summary</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <div><p className="text-xs uppercase text-muted-foreground">Supplier</p><p className="font-medium">{purchaseReturn.supplier_name ?? purchaseReturn.supplier_id}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">GRN / PO</p><p className="font-medium">{purchaseReturn.grn_no ?? "-"} / {purchaseReturn.po_no ?? "-"}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Return Date</p><p className="font-medium">{purchaseReturn.return_date}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Return Value</p><p className="font-medium">{formatCurrency(totalValue)}</p></div>
          </div>
          {purchaseReturn.reason || purchaseReturn.remarks ? <p className="rounded-md border bg-secondary/30 p-3 text-sm">{purchaseReturn.reason ?? purchaseReturn.remarks}</p> : null}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Returned Items</h2>
            <p className="text-sm font-semibold">{formatCurrency(totalValue)}</p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Previously Returned</TableHead>
                  <TableHead className="text-right">Return Qty</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell><p className="font-medium">{line.item?.item_name ?? line.item_id}</p><p className="text-xs text-muted-foreground">{line.item?.item_code ?? "-"}</p></TableCell>
                    <TableCell className="text-right">{formatNumber(line.received_qty)}</TableCell>
                    <TableCell className="text-right">{formatNumber(line.previously_returned_qty)}</TableCell>
                    <TableCell className="text-right font-medium">{formatNumber(line.return_qty)}</TableCell>
                    <TableCell>{line.uom}</TableCell>
                    <TableCell className="text-right">{formatCurrency(line.unit_cost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(line.return_qty * line.unit_cost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </DocumentWorkspace>
  );
}
