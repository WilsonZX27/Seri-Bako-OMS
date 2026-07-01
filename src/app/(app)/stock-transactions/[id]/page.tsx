import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApprovalPanel, AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { getDocumentBundle } from "@/server/queries/documents";
import { getStockTransaction } from "@/server/queries/inventory";

function statusVariant(status: string) {
  if (status === "posted") return "success";
  if (status === "cancelled") return "danger";
  return "secondary";
}

export default async function StockTransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const transaction = await getStockTransaction(id);
  const documentBundle = transaction.document_id ? await getDocumentBundle(transaction.document_id) : null;
  const movementQty = Math.max(transaction.quantity_in, transaction.quantity_out);

  return (
    <>
      <PageHeader title={transaction.transaction_no} description="Posted stock ledger transaction. Posted movements are append-only." />
      <div className="grid gap-5 p-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Transaction Status</p>
                  <Badge className="mt-1" variant={statusVariant(transaction.status)}>{transaction.status}</Badge>
                </div>
                <Button asChild variant="outline"><Link href="/stock-transactions">Back to ledger</Link></Button>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div><p className="text-xs uppercase text-muted-foreground">Date</p><p className="font-medium">{transaction.transaction_date}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Type</p><p className="font-medium">{transaction.transaction_type.replaceAll("_", " ")}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Posted At</p><p className="font-medium">{transaction.posted_at ?? "-"}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Reference</p><p className="font-medium">{transaction.reference_type ?? "-"}</p></div>
              </div>
              {transaction.remarks ? <p className="rounded-md border bg-secondary/30 p-3 text-sm">{transaction.remarks}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="mb-3 text-sm font-semibold">Ledger Line</h2>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Qty In</TableHead>
                      <TableHead className="text-right">Qty Out</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell><p className="font-medium">{transaction.item?.item_name ?? transaction.item_id}</p><p className="text-xs text-muted-foreground">{transaction.item?.item_code}</p></TableCell>
                      <TableCell>{transaction.branch?.branch_name ?? "-"}</TableCell>
                      <TableCell>{transaction.location?.location_name ?? "-"}</TableCell>
                      <TableCell className="text-right">{transaction.quantity_in > 0 ? `${formatNumber(transaction.quantity_in)} ${transaction.item?.base_unit ?? ""}` : "-"}</TableCell>
                      <TableCell className="text-right">{transaction.quantity_out > 0 ? `${formatNumber(transaction.quantity_out)} ${transaction.item?.base_unit ?? ""}` : "-"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(transaction.unit_cost ?? 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(transaction.total_cost ?? movementQty * (transaction.unit_cost ?? 0))}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {documentBundle ? (
            <>
              <ApprovalPanel document={documentBundle.document} approval={documentBundle.approval} approvalSteps={documentBundle.approvalSteps} />
              <AttachmentPanel documentId={documentBundle.document.id} attachments={documentBundle.attachments} />
              <CommentsPanel documentId={documentBundle.document.id} comments={documentBundle.comments} />
            </>
          ) : null}
        </div>
        <div className="space-y-5">
          {documentBundle ? (
            <>
              <DocumentTimeline document={documentBundle.document} activities={documentBundle.activityLogs} comments={documentBundle.comments} attachments={documentBundle.attachments} />
              <RevisionPanel revisions={documentBundle.revisions} />
            </>
          ) : (
            <Card><CardContent className="p-5 text-sm text-muted-foreground">This mock or legacy movement has no linked document yet.</CardContent></Card>
          )}
        </div>
      </div>
    </>
  );
}
