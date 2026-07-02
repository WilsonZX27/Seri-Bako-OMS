import { DocumentNumber } from "@/components/document-number";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ApprovalPanel, AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { formatStatusLabel } from "@/lib/status-label";
import { getDocumentBundle } from "@/server/queries/documents";

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-";
}

export default async function DocumentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { id } = await params;
  const [messageParams, bundle] = await Promise.all([searchParams, getDocumentBundle(id)]);
  const document = bundle.document;

  return (
    <>
      <PageHeader title={<DocumentNumber value={document.document_no} size="lg" />} description={document.title} />
      <div className="grid gap-5 p-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          {messageParams.error || messageParams.success ? (
            <Card>
              <CardContent className={`p-4 text-sm ${messageParams.error ? "text-destructive" : "text-emerald-700"}`}>
                {messageParams.error ?? messageParams.success}
              </CardContent>
            </Card>
          ) : null}
          <Card>
            <CardContent className="p-5">
              <div className="grid gap-4 md:grid-cols-3">
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
                  <p className="mt-1 font-medium">{formatDate(document.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Updated</p>
                  <p className="mt-1 font-medium">{formatDate(document.updated_at)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Revision</p>
                  <p className="mt-1 font-medium">Revision {document.revision_no}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Related Entity Type</p>
                  <p className="mt-1 font-medium">{document.related_entity_type ? formatStatusLabel(document.related_entity_type) : "-"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Related Entity ID</p>
                  <p className="mt-1 break-all font-medium">{document.related_entity_id ?? "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <ApprovalPanel document={document} approval={bundle.approval} approvalSteps={bundle.approvalSteps} />
          <AttachmentPanel documentId={document.id} attachments={bundle.attachments} />
          <CommentsPanel documentId={document.id} comments={bundle.comments} />
        </div>
        <div className="space-y-5">
          <DocumentTimeline document={document} activities={bundle.activityLogs} comments={bundle.comments} attachments={bundle.attachments} />
          <RevisionPanel revisions={bundle.revisions} />
        </div>
      </div>
    </>
  );
}
