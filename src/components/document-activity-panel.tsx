import { AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import type { getDocumentBundle } from "@/server/queries/documents";

type DocumentBundle = Awaited<ReturnType<typeof getDocumentBundle>>;

export function DocumentActivityPanel({ bundle }: { bundle: NonNullable<DocumentBundle> }) {
  return (
    <>
      <CommentsPanel documentId={bundle.document.id} comments={bundle.comments} />
      <AttachmentPanel documentId={bundle.document.id} attachments={bundle.attachments} />
    </>
  );
}

export function DocumentTimelinePanel({ bundle }: { bundle: NonNullable<DocumentBundle> }) {
  return (
    <>
      <DocumentTimeline document={bundle.document} activities={bundle.activityLogs} comments={bundle.comments} attachments={bundle.attachments} />
      <RevisionPanel revisions={bundle.revisions} />
    </>
  );
}
