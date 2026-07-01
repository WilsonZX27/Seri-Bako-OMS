import { AlertTriangle } from "lucide-react";
import { ApprovalPanel, AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";
import { approveStockCount, cancelStockCount, postStockCount, rejectStockCount, reviewStockCount, submitStockCount } from "@/server/actions/stock-counts";
import { getDocumentBundle } from "@/server/queries/documents";
import { getStockCount } from "@/server/queries/stock-counts";

function statusVariant(status: string) {
  if (["approved", "posted"].includes(status)) return "success";
  if (["rejected", "cancelled"].includes(status)) return "danger";
  if (["submitted", "reviewed"].includes(status)) return "warning";
  return "secondary";
}

export default async function StockCountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { count, lines } = await getStockCount(id);
  const documentBundle = count.document_id ? await getDocumentBundle(count.document_id) : null;
  const highVarianceLines = lines.filter((line) => Math.abs(line.variance_percent) > count.tolerance_percent);
  const hasHighVarianceAttachment = documentBundle?.attachments.length ? true : false;

  return (
    <>
      <PageHeader title={count.count_no} description="Stock count variance review and posting workflow" />
      <div className="grid gap-5 p-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Status</p>
                  <Badge className="mt-1" variant={statusVariant(count.status)}>{count.status}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={submitStockCount.bind(null, count.id)}><Button type="submit" variant="secondary">Submit</Button></form>
                  <form action={reviewStockCount.bind(null, count.id)}><Button type="submit" variant="outline">Review</Button></form>
                  <form action={approveStockCount.bind(null, count.id)}><Button type="submit">Approve</Button></form>
                  <form action={postStockCount.bind(null, count.id)}><Button type="submit" variant="outline">Post variance</Button></form>
                  <form action={rejectStockCount.bind(null, count.id)}><Button type="submit" variant="destructive">Reject</Button></form>
                  <form action={cancelStockCount.bind(null, count.id)}><Button type="submit" variant="ghost">Cancel</Button></form>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div><p className="text-xs uppercase text-muted-foreground">Date</p><p className="font-medium">{count.count_date}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Location</p><p className="font-medium">{count.location_name ?? count.location_id}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Tolerance</p><p className="font-medium">{formatNumber(count.tolerance_percent)}%</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">High Variance</p><p className="font-medium">{highVarianceLines.length}</p></div>
              </div>
              {highVarianceLines.length && !hasHighVarianceAttachment ? (
                <div className="flex gap-2 rounded-md bg-warning/10 p-3 text-sm text-warning">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  High variance lines detected. Attach a count sheet photo or supporting proof before final approval.
                </div>
              ) : null}
              {count.remarks ? <p className="rounded-md border bg-secondary/30 p-3 text-sm">{count.remarks}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="mb-3 text-sm font-semibold">Count Lines</h2>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Barcode</TableHead>
                      <TableHead className="text-right">Theoretical</TableHead>
                      <TableHead className="text-right">Physical</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead className="text-right">Variance %</TableHead>
                      <TableHead>UOM</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line) => {
                      const high = Math.abs(line.variance_percent) > count.tolerance_percent;
                      return (
                        <TableRow key={line.id} className={high ? "bg-warning/10" : ""}>
                          <TableCell><p className="font-medium">{line.item?.item_name ?? line.item_id}</p><p className="text-xs text-muted-foreground">{line.item?.item_code}</p></TableCell>
                          <TableCell className="text-xs">{line.barcode ?? "-"}</TableCell>
                          <TableCell className="text-right">{formatNumber(line.theoretical_qty)}</TableCell>
                          <TableCell className="text-right font-medium">{formatNumber(line.physical_qty)}</TableCell>
                          <TableCell className="text-right">{formatNumber(line.variance_qty)}</TableCell>
                          <TableCell className={`text-right ${high ? "font-semibold text-warning" : ""}`}>{formatNumber(line.variance_percent)}%</TableCell>
                          <TableCell>{line.uom}</TableCell>
                          <TableCell>{line.remarks ?? (high ? "Remarks required" : "-")}</TableCell>
                        </TableRow>
                      );
                    })}
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
          ) : null}
        </div>
      </div>
    </>
  );
}
