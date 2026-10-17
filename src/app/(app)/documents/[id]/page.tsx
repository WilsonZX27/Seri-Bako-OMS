import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { ApprovalPanel, AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { MobileTaskSheet } from "@/components/documents/mobile-document-surfaces";
import { DocumentWorkspace } from "@/components/documents/document-workspace";
import { getCanonicalDocumentHref } from "@/lib/document-routing";
import { formatStatusLabel } from "@/lib/status-label";
import { formatDateTime } from "@/lib/utils";
import { getDocumentBundle } from "@/server/queries/documents";
import { detailOrNotFound } from "@/server/queries/detail";

const documentSteps = [
  { key: "draft", label: "Draft", description: "Document is being prepared." },
  { key: "pending_approval", label: "In Review", description: "Document is being reviewed." },
  { key: "approved", label: "Approved", description: "Document has been approved." },
  { key: "posted", label: "Posted", description: "Document has been posted." },
  { key: "cancelled", label: "Cancelled", description: "Document was cancelled." },
];

export default async function DocumentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { id } = await params;
  const [messageParams, bundle] = await Promise.all([searchParams, detailOrNotFound(getDocumentBundle(id))]);
  const document = bundle.document;
  const canonicalHref = getCanonicalDocumentHref(document);
  if (canonicalHref !== `/documents/${document.id}`) {
    const messageKey = messageParams.error ? "error" : messageParams.success ? "success" : null;
    const message = messageParams.error ?? messageParams.success;
    redirect(messageKey && message ? `${canonicalHref}?${messageKey}=${encodeURIComponent(message)}` : canonicalHref);
  }

  return (
    <DocumentWorkspace
      breadcrumbs={[{ label: "Documents", href: "/documents" }, { label: document.document_no }]}
      documentNo={document.document_no}
      title={document.title}
      status={document.status}
      workflowSteps={documentSteps}
      currentStatus={["submitted", "pending_approval"].includes(document.status) ? "pending_approval" : document.status}
      mobilePrimaryAction={<MobileTaskSheet label="Document actions" primary><ApprovalPanel compact document={document} approval={bundle.approval} approvalSteps={bundle.approvalSteps} /></MobileTaskSheet>}
      mobileActivity={<><CommentsPanel documentId={document.id} comments={bundle.comments}/><AttachmentPanel documentId={document.id} attachments={bundle.attachments}/><DocumentTimeline document={document} activities={bundle.activityLogs} comments={bundle.comments} attachments={bundle.attachments}/><RevisionPanel revisions={bundle.revisions}/></>}
      sidePanel={
        <>
          <ApprovalPanel document={document} approval={bundle.approval} approvalSteps={bundle.approvalSteps} />
          <details><summary className="cursor-pointer py-3 text-sm font-medium">Comments and files</summary><CommentsPanel documentId={document.id} comments={bundle.comments} />
          <AttachmentPanel documentId={document.id} attachments={bundle.attachments} /></details><details><summary className="cursor-pointer py-3 text-sm font-medium">Activity and revisions</summary>
          <DocumentTimeline document={document} activities={bundle.activityLogs} comments={bundle.comments} attachments={bundle.attachments} />
          <RevisionPanel revisions={bundle.revisions} /></details>
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
          <Card>
            <CardContent className="p-5">
              <div className="sb-label-value-summary grid gap-4 xl:grid-cols-3">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Document Type</p>
                  <p className="mt-1 font-medium">{formatStatusLabel(document.document_type)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Status</p>
                  <StatusBadge status={document.status} />
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Approval Status</p>
                  <StatusBadge status={document.approval_status} />
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Current Step</p>
                  <p className="mt-1 font-medium">{document.current_step ? formatStatusLabel(document.current_step) : "-"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Created</p>
                  <p className="mt-1 font-medium">{formatDateTime(document.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Updated</p>
                  <p className="mt-1 font-medium">{formatDateTime(document.updated_at)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Revision</p>
                  <p className="mt-1 font-medium">Revision {document.revision_no}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Related Entity Type</p>
                  <p className="mt-1 font-medium">{document.related_entity_type ? formatStatusLabel(document.related_entity_type) : "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
    </DocumentWorkspace>
  );
}
