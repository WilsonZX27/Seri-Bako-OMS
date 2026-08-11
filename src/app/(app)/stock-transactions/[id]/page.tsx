import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConsoleSection } from "@/components/layout/right-console";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { getDocumentBundle } from "@/server/queries/documents";
import { getStockTransaction } from "@/server/queries/inventory";

function statusVariant(status: string) {
  if (status === "posted") return "success";
  if (status === "cancelled") return "danger";
  return "secondary";
}

function formatDateTime(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-";
}

function isUuid(value: string | null) {
  return Boolean(value?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i));
}

function relatedHref(type: string | null, id: string | null) {
  if (!type || !isUuid(id)) return null;
  if (type.includes("wastage") || type.includes("write")) return `/stock-wastage/${id}`;
  if (type.includes("receiving") || type.includes("grn") || type.includes("purchase")) return `/goods-receivings/${id}`;
  if (type.includes("production")) return `/production/jobs/${id}`;
  if (type.includes("transfer")) return `/stock-transfers/${id}`;
  if (type.includes("count")) return `/stock-counts/${id}`;
  if (type.includes("return")) return `/purchase-returns/${id}`;
  return null;
}

export default async function StockTransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const transaction = await getStockTransaction(id);
  const documentBundle = transaction.document_id ? await getDocumentBundle(transaction.document_id) : null;
  const movementQty = Math.max(transaction.quantity_in, transaction.quantity_out);
  const sourceHref = relatedHref(transaction.reference_type, transaction.reference_id);

  return (
    <>
      <PageHeader title={transaction.transaction_no} description="Posted Movement Ledger transaction. Posted movements are append-only." />
      <WorkspaceGrid
        className="p-5"
        rightRail={
          <>
            <ConsoleSection title="Transaction Context">
              <dl className="grid gap-2 text-xs">
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Status</dt><dd><StatusBadge status={transaction.status} /></dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Type</dt><dd className="text-right capitalize">{transaction.transaction_type.replaceAll("_", " ")}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">No.</dt><dd className="text-right font-semibold">{transaction.transaction_no}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Date</dt><dd className="text-right">{formatDateTime(transaction.transaction_date)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Branch</dt><dd className="text-right">{transaction.branch?.branch_name ?? "-"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Source</dt><dd className="text-right">{transaction.reference_type?.replaceAll("_", " ") ?? "-"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Posted at</dt><dd className="text-right">{formatDateTime(transaction.posted_at)}</dd></div>
              </dl>
            </ConsoleSection>
            {sourceHref ? (
              <ConsoleSection title="Related Record">
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={sourceHref}>Open source record</Link>
                </Button>
              </ConsoleSection>
            ) : null}
            {documentBundle ? <AttachmentPanel documentId={documentBundle.document.id} attachments={documentBundle.attachments} /> : null}
            {documentBundle ? <CommentsPanel documentId={documentBundle.document.id} comments={documentBundle.comments} /> : null}
            <ConsoleSection title="Record State">
              <p className="text-xs text-muted-foreground">Posted transactions are append-only. Use an adjustment or reversal flow for corrections.</p>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/stock-transactions">Back to ledger</Link>
              </Button>
            </ConsoleSection>
          </>
        }
      >
        <div className="space-y-5">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Transaction Status</p>
                  <Badge className="mt-1" variant={statusVariant(transaction.status)}>{transaction.status}</Badge>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div><p className="text-xs uppercase text-muted-foreground">Date</p><p className="font-medium">{transaction.transaction_date}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Type</p><p className="font-medium">{transaction.transaction_type.replaceAll("_", " ")}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Posted At</p><p className="font-medium">{transaction.posted_at ?? "-"}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Reference</p><p className="font-medium">{transaction.reference_type ?? "-"}</p></div>
              </div>
              {transaction.remarks ? <p className="border bg-secondary/30 p-3 text-sm">{transaction.remarks}</p> : null}
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
              <DocumentTimeline document={documentBundle.document} activities={documentBundle.activityLogs} comments={documentBundle.comments} attachments={documentBundle.attachments} />
              <RevisionPanel revisions={documentBundle.revisions} />
            </>
          ) : (
            <Card><CardContent className="p-5 text-sm text-muted-foreground">This mock or legacy movement has no linked document yet.</CardContent></Card>
          )}
        </div>
      </WorkspaceGrid>
    </>
  );
}
