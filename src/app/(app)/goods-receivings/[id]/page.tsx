import { AlertTriangle, ExternalLink, PackageCheck } from "lucide-react";
import { DocumentActionBar, DocumentActionForm, DocumentActionLink } from "@/components/document-action-bar";
import { AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { DocumentActionSection, DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { DocumentMoreOptions, MobileTaskSheet } from "@/components/documents/mobile-document-surfaces";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { BlockedDestructiveAction } from "@/components/ui/danger-confirm-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDateOnly, formatNumber } from "@/lib/utils";
import { cancelGoodsReceiving, postGoodsReceiving } from "@/server/actions/goods-receivings";
import { getPermissionMap } from "@/server/auth/permissions";
import { getDocumentBundle } from "@/server/queries/documents";
import { getGoodsReceiving } from "@/server/queries/goods-receivings";
import { detailOrNotFound } from "@/server/queries/detail";

const grnSteps = [
  { key: "draft", label: "Draft", description: "Receiving is being checked." },
  { key: "posted", label: "Posted", description: "Stock has been posted to inventory." },
  { key: "cancelled", label: "Cancelled", description: "Receiving was cancelled before posting." },
];

export default async function GoodsReceivingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ receiving, lines }, permissions] = await Promise.all([
    detailOrNotFound(getGoodsReceiving(id)),
    getPermissionMap(["grn.post", "goods_receiving.cancel", "documents.attach"]),
  ]);
  const documentBundle = receiving.document_id ? await getDocumentBundle(receiving.document_id) : null;
  const totalReceivedValue = lines.reduce((sum, line) => sum + line.received_qty * line.unit_cost, 0);
  const hasRejected = lines.some((line) => line.rejected_qty > 0);
  const hasDeliveryOrder = Boolean(documentBundle?.attachments.some((attachment) => attachment.status === "active"));
  const receivingDisplay = receiving as typeof receiving & { supplier_name?: string | null; branch_name?: string | null };
  const hasPrimaryAction = permissions["grn.post"] && receiving.status === "draft";
  const secondaryActions = receiving.status === "draft" && permissions["goods_receiving.cancel"] ? <DocumentActionForm action={cancelGoodsReceiving.bind(null, receiving.id)} pendingLabel="Deleting draft..." variant="destructive">Delete draft</DocumentActionForm> : receiving.status !== "draft" ? <BlockedDestructiveAction buttonLabel="Delete receiving" title={`Cannot delete ${receiving.grn_no}`} description={receiving.status === "posted" ? "This receiving has posted stock movements and must remain in the audit trail." : "This receiving is linked to its purchase order and document history."} recommendation={receiving.status === "posted" ? "Use a purchase return or correction workflow. Physical deletion is prohibited." : "This record is already outside active draft work."} /> : null;
  const mobilePrimaryAction = hasPrimaryAction ? (hasDeliveryOrder
    ? <DocumentActionForm action={postGoodsReceiving.bind(null, receiving.id)} pendingLabel="Posting..."><PackageCheck className="h-4 w-4" aria-hidden="true" />Post Receiving to Stock</DocumentActionForm>
    : <MobileTaskSheet label="Post Receiving to Stock"><form action={postGoodsReceiving.bind(null, receiving.id)} className="space-y-2"><Textarea name="do_exception_reason" placeholder="Document why no Delivery Order is available" required /><SubmitButton pendingLabel="Posting..." className="w-full justify-center"><PackageCheck className="h-4 w-4" aria-hidden="true" />Post Receiving to Stock</SubmitButton></form></MobileTaskSheet>) : null;

  return (
    <DocumentWorkspace
      breadcrumbs={[{ label: "Procurement", href: "/procurement" }, { label: "Goods Receiving", href: "/goods-receivings" }, { label: receiving.grn_no }]}
      documentNo={receiving.grn_no}
      title="Goods Receiving"
      status={receiving.status}
      workflowSteps={grnSteps}
      currentStatus={receiving.status}
      mobilePrimaryAction={mobilePrimaryAction}
      mobileActivity={documentBundle ? <><AttachmentPanel documentId={documentBundle.document.id} attachments={documentBundle.attachments} title="Delivery Order" canManage={false} documentStatus={documentBundle.document.status} /><CommentsPanel documentId={documentBundle.document.id} comments={documentBundle.comments} /><DocumentTimeline document={documentBundle.document} activities={documentBundle.activityLogs} comments={documentBundle.comments} attachments={documentBundle.attachments} /></> : null}
      mobileMoreOptions={secondaryActions ? <DocumentMoreOptions>{secondaryActions}</DocumentMoreOptions> : null}
      sidePanel={
        <>
          <DocumentActionSection description="Post after receiving details are checked. Attachments can be added for audit support." moreOptions={secondaryActions}>
            <DocumentActionBar>
              {hasPrimaryAction ? <form action={postGoodsReceiving.bind(null, receiving.id)} className="space-y-2" data-mobile-primary-action>
                {!hasDeliveryOrder ? <Textarea name="do_exception_reason" placeholder="If no DO is available, document the exception" required /> : null}
                <SubmitButton pendingLabel="Posting..." className="w-full justify-center"><PackageCheck className="h-4 w-4" aria-hidden="true" />Post Receiving to Stock</SubmitButton>
              </form> : null}
            </DocumentActionBar>
            {!hasPrimaryAction && receiving.status === "draft" ? <p className="mt-3 text-sm text-muted-foreground">You can view this GRN, but you do not have permission to post it.</p> : null}
          </DocumentActionSection>
          <DocumentSideSection title="Validation / Next Step"><DocumentActionLink href={`/purchase-orders/${receiving.purchase_order_id}`} variant="outline"><ExternalLink className="h-4 w-4" aria-hidden="true" />View Purchase Order</DocumentActionLink><p className="text-xs text-muted-foreground">{receiving.status === "draft" ? "Attach the Delivery Order or document an exception before posting." : "This receiving is finalized and read-only."}</p></DocumentSideSection>
          {!hasDeliveryOrder && receiving.status === "draft" ? (
            <DocumentSideSection title="Attachment Recommended">
              <div className="flex gap-2 rounded-md bg-warning/10 p-3 text-sm text-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Add the Delivery Order attachment when it is available.
              </div>
            </DocumentSideSection>
          ) : null}
          {documentBundle ? (
            <>
              <AttachmentPanel documentId={documentBundle.document.id} attachments={documentBundle.attachments} title="Delivery Order" defaultLabel="Delivery Order" uploadLabel="Attach DO" canManage={permissions["documents.attach"]} documentStatus={documentBundle.document.status} />
              <CommentsPanel documentId={documentBundle.document.id} comments={documentBundle.comments} />
              <DocumentTimeline document={documentBundle.document} activities={documentBundle.activityLogs} comments={documentBundle.comments} attachments={documentBundle.attachments} />
              <RevisionPanel revisions={documentBundle.revisions} />
            </>
          ) : null}
        </>
      }
    >
          {documentBundle ? <div className="md:hidden"><AttachmentPanel documentId={documentBundle.document.id} attachments={documentBundle.attachments} title="Delivery Order" description="Required before posting, unless a documented exception is provided." defaultLabel="Delivery Order" uploadLabel="Attach DO" presentation="inline" canManage={permissions["documents.attach"]} documentStatus={documentBundle.document.status} /></div> : null}
          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="text-sm font-semibold">Receiving Summary</h2>
              <div className="grid gap-4 md:grid-cols-4">
                <div><p className="text-xs uppercase text-muted-foreground">Supplier</p><p className="font-medium">{receivingDisplay.supplier_name ?? receiving.supplier_id}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Received Date</p><p className="font-medium">{formatDateOnly(receiving.received_date)}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Branch</p><p className="font-medium">{receivingDisplay.branch_name ?? "-"}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Received Value</p><p className="font-medium">{formatCurrency(totalReceivedValue)}</p></div>
              </div>
              {hasRejected ? (
                <div className="flex gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  This GRN contains rejected quantity. Rejected quantity does not increase stock.
                </div>
              ) : null}
              {receiving.remarks ? <p className="rounded-md border bg-secondary/30 p-3 text-sm">{receiving.remarks}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Received Items</h2>
                <p className="text-sm font-semibold">{formatCurrency(totalReceivedValue)}</p>
              </div>
              <Table mobileHidden aria-label="Received items">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Ordered</TableHead>
                      <TableHead className="text-right">Previously Received</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Rejected</TableHead>
                      <TableHead>UOM</TableHead>
                      <TableHead>Batch / Expiry</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Stock Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <p className="font-medium">{line.item?.item_name ?? line.item_id}</p>
                          <p className="text-xs text-muted-foreground">{line.item?.item_code ?? "-"}</p>
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(line.ordered_qty)}</TableCell>
                        <TableCell className="text-right">{formatNumber(line.previously_received_qty)}</TableCell>
                        <TableCell className="text-right">{formatNumber(line.pending_qty)}</TableCell>
                        <TableCell className="text-right font-medium">{formatNumber(line.received_qty)}</TableCell>
                        <TableCell className="text-right">{line.rejected_qty > 0 ? <span className="font-medium text-destructive">{formatNumber(line.rejected_qty)}</span> : formatNumber(0)}</TableCell>
                        <TableCell>{line.uom}</TableCell>
                        <TableCell><p>{line.batch_no ?? "-"}</p><p className="text-xs text-muted-foreground">{formatDateOnly(line.expiry_date, "")}</p></TableCell>
                        <TableCell className="text-right">{formatCurrency(line.unit_cost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(line.received_qty * line.unit_cost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
              </Table>
              <div className="divide-y divide-[var(--sb-border-soft)] xl:hidden" role="list" aria-label="Received items" data-goods-receiving-detail-lines>
                {lines.map((line) => (
                  <article key={line.id} role="listitem" className="min-w-0 py-3 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words text-sm font-semibold leading-tight">{line.item?.item_name ?? line.item_id}</h3>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{line.item?.item_code ?? "No item code"}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[11px] text-muted-foreground">Received</p>
                        <p className="font-semibold tabular-nums">{formatNumber(line.received_qty)} {line.uom}</p>
                      </div>
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-x-3 border-y border-[var(--sb-border-soft)] py-2 text-xs">
                      <div><dt className="text-muted-foreground">Ordered</dt><dd className="mt-0.5 font-medium tabular-nums">{formatNumber(line.ordered_qty)}</dd></div>
                      <div><dt className="text-muted-foreground">Previously</dt><dd className="mt-0.5 font-medium tabular-nums">{formatNumber(line.previously_received_qty)}</dd></div>
                      <div><dt className="text-muted-foreground">Pending</dt><dd className="mt-0.5 font-medium tabular-nums">{formatNumber(line.pending_qty)}</dd></div>
                    </dl>
                    {line.rejected_qty > 0 ? <p className="mt-2 text-xs font-medium text-destructive">Rejected {formatNumber(line.rejected_qty)} {line.uom} · excluded from stock</p> : null}
                    {line.batch_no || line.expiry_date ? <p className="mt-2 text-xs text-muted-foreground">Batch {line.batch_no ?? "not recorded"}{line.expiry_date ? ` · Expires ${formatDateOnly(line.expiry_date)}` : ""}</p> : null}
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>{formatCurrency(line.unit_cost)} / {line.uom}</span>
                      <span className="font-medium text-foreground">Stock value {formatCurrency(line.received_qty * line.unit_cost)}</span>
                    </div>
                  </article>
                ))}
              </div>
            </CardContent>
          </Card>

    </DocumentWorkspace>
  );
}
