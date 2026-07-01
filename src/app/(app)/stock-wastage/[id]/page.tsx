import { AlertTriangle } from "lucide-react";
import { ApprovalPanel, AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";
import { cancelStockWastage, postStockWastage, rejectStockWastage } from "@/server/actions/stock-operations";
import { getDocumentBundle } from "@/server/queries/documents";
import { getStockWastageDetail } from "@/server/queries/stock-operations";

const variant = (s: string) => s === "posted" || s === "approved" ? "success" : s === "rejected" || s === "cancelled" ? "danger" : "secondary";
const needsEvidence = (reason: string) => ["damaged", "expired", "supplier_claim"].includes(reason);

export default async function StockWastageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { wastage, lines } = await getStockWastageDetail(id);
  const bundle = wastage.document_id ? await getDocumentBundle(wastage.document_id) : null;
  const evidenceMissing = needsEvidence(wastage.reason) && !bundle?.attachments.length;
  return (
    <><PageHeader title={wastage.wastage_no} description="Stock wastage detail and posting workflow" /><div className="grid gap-5 p-5 xl:grid-cols-[1fr_420px]"><div className="space-y-5">
      <Card><CardContent className="space-y-4 p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><Badge variant={variant(wastage.status)}>{wastage.status}</Badge><div className="flex gap-2"><form action={postStockWastage.bind(null, wastage.id)}><Button>Post wastage</Button></form><form action={rejectStockWastage.bind(null, wastage.id)}><Button variant="destructive">Reject</Button></form><form action={cancelStockWastage.bind(null, wastage.id)}><Button variant="ghost">Cancel</Button></form></div></div><div className="grid gap-4 md:grid-cols-3"><div><p className="text-xs text-muted-foreground">Date</p><p className="font-medium">{wastage.wastage_date}</p></div><div><p className="text-xs text-muted-foreground">Location</p><p className="font-medium">{wastage.location_name}</p></div><div><p className="text-xs text-muted-foreground">Reason</p><p className="font-medium">{wastage.reason.replaceAll("_", " ")}</p></div></div>{evidenceMissing ? <div className="flex gap-2 rounded-md bg-warning/10 p-3 text-sm text-warning"><AlertTriangle className="h-4 w-4" /> Photo attachment required before posting this wastage reason.</div> : null}{wastage.remarks ? <p className="rounded-md border bg-secondary/30 p-3 text-sm">{wastage.remarks}</p> : null}</CardContent></Card>
      <Card><CardContent className="p-5"><Table><TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Barcode</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>Reason</TableHead><TableHead>Batch / Expiry</TableHead><TableHead>Remarks</TableHead></TableRow></TableHeader><TableBody>{lines.map((line) => <TableRow key={line.id}><TableCell><p className="font-medium">{line.item?.item_name ?? line.item_id}</p><p className="text-xs text-muted-foreground">{line.item?.item_code}</p></TableCell><TableCell>{line.barcode ?? "-"}</TableCell><TableCell className="text-right">{formatNumber(line.quantity)} {line.uom}</TableCell><TableCell>{line.reason.replaceAll("_", " ")}</TableCell><TableCell>{line.batch_no ?? "-"}<p className="text-xs text-muted-foreground">{line.expiry_date ?? ""}</p></TableCell><TableCell>{line.remarks ?? "-"}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      {bundle ? <><ApprovalPanel document={bundle.document} approval={bundle.approval} approvalSteps={bundle.approvalSteps} /><AttachmentPanel documentId={bundle.document.id} attachments={bundle.attachments} /><CommentsPanel documentId={bundle.document.id} comments={bundle.comments} /></> : null}
    </div><div className="space-y-5">{bundle ? <><DocumentTimeline document={bundle.document} activities={bundle.activityLogs} comments={bundle.comments} attachments={bundle.attachments} /><RevisionPanel revisions={bundle.revisions} /></> : null}</div></div></>
  );
}
