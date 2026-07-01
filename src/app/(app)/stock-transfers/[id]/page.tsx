import { ApprovalPanel, AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";
import { cancelStockTransfer, postStockTransfer, rejectStockTransfer } from "@/server/actions/stock-operations";
import { getDocumentBundle } from "@/server/queries/documents";
import { getStockTransfer } from "@/server/queries/stock-operations";

const variant = (s: string) => s === "posted" || s === "approved" ? "success" : s === "rejected" || s === "cancelled" ? "danger" : "secondary";

export default async function StockTransferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { transfer, lines } = await getStockTransfer(id);
  const bundle = transfer.document_id ? await getDocumentBundle(transfer.document_id) : null;
  return (
    <><PageHeader title={transfer.transfer_no} description="Stock transfer detail and posting workflow" /><div className="grid gap-5 p-5 xl:grid-cols-[1fr_420px]"><div className="space-y-5">
      <Card><CardContent className="space-y-4 p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><Badge variant={variant(transfer.status)}>{transfer.status}</Badge><div className="flex gap-2"><form action={postStockTransfer.bind(null, transfer.id)}><Button>Post transfer</Button></form><form action={rejectStockTransfer.bind(null, transfer.id)}><Button variant="destructive">Reject</Button></form><form action={cancelStockTransfer.bind(null, transfer.id)}><Button variant="ghost">Cancel</Button></form></div></div><div className="grid gap-4 md:grid-cols-3"><div><p className="text-xs text-muted-foreground">Date</p><p className="font-medium">{transfer.transfer_date}</p></div><div><p className="text-xs text-muted-foreground">From</p><p className="font-medium">{transfer.from_location_name}</p></div><div><p className="text-xs text-muted-foreground">To</p><p className="font-medium">{transfer.to_location_name}</p></div></div>{transfer.remarks ? <p className="rounded-md border bg-secondary/30 p-3 text-sm">{transfer.remarks}</p> : null}</CardContent></Card>
      <Card><CardContent className="p-5"><Table><TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Barcode</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>UOM</TableHead><TableHead>Remarks</TableHead></TableRow></TableHeader><TableBody>{lines.map((line) => <TableRow key={line.id}><TableCell><p className="font-medium">{line.item?.item_name ?? line.item_id}</p><p className="text-xs text-muted-foreground">{line.item?.item_code}</p></TableCell><TableCell>{line.barcode ?? "-"}</TableCell><TableCell className="text-right">{formatNumber(line.quantity)}</TableCell><TableCell>{line.uom}</TableCell><TableCell>{line.remarks ?? "-"}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      {bundle ? <><ApprovalPanel document={bundle.document} approval={bundle.approval} approvalSteps={bundle.approvalSteps} /><AttachmentPanel documentId={bundle.document.id} attachments={bundle.attachments} /><CommentsPanel documentId={bundle.document.id} comments={bundle.comments} /></> : null}
    </div><div className="space-y-5">{bundle ? <><DocumentTimeline document={bundle.document} activities={bundle.activityLogs} comments={bundle.comments} attachments={bundle.attachments} /><RevisionPanel revisions={bundle.revisions} /></> : null}</div></div></>
  );
}
