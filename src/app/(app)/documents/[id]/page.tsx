import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ApprovalPanel, AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { getDocumentBundle } from "@/server/queries/documents";

function statusVariant(status: string) {
  if (["approved", "posted", "closed"].includes(status)) return "success";
  if (["rejected", "cancelled"].includes(status)) return "danger";
  return "secondary";
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-";
}

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bundle = await getDocumentBundle(id);
  const document = bundle.document;

  return (
    <>
      <PageHeader title={document.document_no} description={document.title} />
      <div className="grid gap-5 p-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <Card>
            <CardContent className="p-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Document Type</p>
                  <p className="mt-1 font-medium">{document.document_type.replaceAll("_", " ")}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Status</p>
                  <Badge className="mt-1" variant={statusVariant(document.status)}>{document.status}</Badge>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Approval Status</p>
                  <Badge className="mt-1" variant={statusVariant(document.approval_status)}>{document.approval_status}</Badge>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Current Step</p>
                  <p className="mt-1 font-medium">{document.current_step ?? "-"}</p>
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
                  <p className="mt-1 font-medium">{document.related_entity_type ?? "-"}</p>
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
