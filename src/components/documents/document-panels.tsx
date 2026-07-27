import { CheckCircle2, Clock, FileText, MessageSquare, Paperclip, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConsoleSection } from "@/components/layout/right-console";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { AttachmentUploadForm } from "@/components/documents/attachment-upload-form";
import { AttachmentRemoveAction } from "@/components/documents/attachment-remove-action";
import { EmptyAttachmentState, EmptyTimelineState } from "@/components/ui/system-states";
import { Textarea } from "@/components/ui/textarea";
import {
  addDocumentAttachment,
  addDocumentComment,
  approveDocument,
  archiveDocumentAttachment,
  cancelDocument,
  postDocument,
  rejectDocument,
  submitDocument,
} from "@/server/actions/documents";
import { hasPermission } from "@/server/auth/permissions";
import { getDocument } from "@/server/queries/documents";
import type { Database } from "@/types/database";

type Document = Database["public"]["Tables"]["documents"]["Row"] & { created_by_name?: string | null; updated_by_name?: string | null };
type Attachment = Database["public"]["Tables"]["attachments"]["Row"] & { uploaded_by_name?: string | null; created_by_name?: string | null };
type Comment = Database["public"]["Tables"]["document_comments"]["Row"] & { created_by_name?: string | null };
type Revision = Database["public"]["Tables"]["document_revisions"]["Row"] & { changed_by_name?: string | null };
type Approval = Database["public"]["Tables"]["approvals"]["Row"] | null;
type ApprovalStep = Database["public"]["Tables"]["approval_steps"]["Row"] & { acted_by_name?: string | null; approver_staff_name?: string | null };
type Activity = Pick<Database["public"]["Tables"]["activity_logs"]["Row"], "id" | "activity_type" | "message" | "created_at" | "created_by"> & { created_by_name?: string | null };

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-";
}

function actorLabel(name: string | null | undefined) {
  return name?.trim() || "System";
}

function eventIcon(type: string) {
  if (["approved", "posted"].includes(type)) return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (["rejected", "cancelled"].includes(type)) return <XCircle className="h-4 w-4 text-destructive" />;
  if (type.includes("comment")) return <MessageSquare className="h-4 w-4 text-primary" />;
  if (type.includes("attachment")) return <Paperclip className="h-4 w-4 text-primary" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

function isMeaningfulTimelineEvent(event: Activity) {
  const message = event.message.trim().toLowerCase();
  if (event.activity_type === "updated" || message === "document updated") return false;
  if (message.includes("document updated")) return false;
  return true;
}

export function DocumentTimeline({ document, activities, comments, attachments }: { document: Document; activities: Activity[]; comments: Comment[]; attachments: Attachment[] }) {
  const syntheticEvents = [
    { id: "created", activity_type: "created", message: "Document created", created_at: document.created_at, created_by: document.created_by, created_by_name: document.created_by_name },
    ...(document.submitted_at ? [{ id: "submitted", activity_type: "submitted", message: "Document submitted", created_at: document.submitted_at, created_by: document.created_by, created_by_name: document.created_by_name }] : []),
    ...(document.posted_at ? [{ id: "posted", activity_type: "posted", message: "Document posted", created_at: document.posted_at, created_by: document.updated_by, created_by_name: document.updated_by_name }] : []),
    ...(document.cancelled_at ? [{ id: "cancelled", activity_type: "cancelled", message: "Document cancelled", created_at: document.cancelled_at, created_by: document.updated_by, created_by_name: document.updated_by_name }] : []),
  ];
  const commentEvents = comments.map((comment) => ({ id: comment.id, activity_type: "comment_added", message: comment.comment_text, created_at: comment.created_at, created_by: comment.created_by, created_by_name: comment.created_by_name }));
  const attachmentEvents = attachments.map((attachment) => ({ id: attachment.id, activity_type: "attachment_uploaded", message: `${attachment.file_name} uploaded`, created_at: attachment.created_at, created_by: attachment.uploaded_by, created_by_name: attachment.uploaded_by_name }));
  const events = [...syntheticEvents, ...activities, ...commentEvents, ...attachmentEvents]
    .filter(isMeaningfulTimelineEvent)
    .filter((event, index, rows) => rows.findIndex((row) => row.activity_type === event.activity_type && row.created_at === event.created_at && row.message === event.message) === index)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <ConsoleSection title="Document Timeline">
        <div className="space-y-0">
          {events.map((event) => (
            <div key={event.id} className="relative flex gap-3 border-l border-[var(--sb-border-soft)] pb-4 pl-3 last:pb-0">
              <div className="-ml-[21px] mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--rail-bg)]">{eventIcon(event.activity_type)}</div>
              <div className="min-w-0">
                <p className="text-xs font-medium">{event.message}</p>
                <p className="text-xs text-muted-foreground">{actorLabel(event.created_by_name)} - {formatDate(event.created_at)}</p>
              </div>
            </div>
          ))}
          {!events.length ? <EmptyTimelineState /> : null}
        </div>
    </ConsoleSection>
  );
}

export async function AttachmentPanel({
  documentId,
  attachments,
  title = "Attachments",
  description,
  defaultLabel,
  uploadLabel,
  presentation = "console",
  canManage,
  documentStatus,
}: {
  documentId: string;
  attachments: Attachment[];
  title?: string;
  description?: string;
  defaultLabel?: string;
  uploadLabel?: string;
  presentation?: "console" | "inline";
  canManage?: boolean;
  documentStatus?: string;
}) {
  const [resolvedCanManage, resolvedDocument] = await Promise.all([
    canManage === undefined ? hasPermission("documents.attach") : Promise.resolve(canManage),
    documentStatus === undefined ? getDocument(documentId) : Promise.resolve(null),
  ]);
  const status = documentStatus ?? resolvedDocument?.status ?? "draft";
  const canRemoveAttachments = resolvedCanManage && ["draft", "pending_approval"].includes(status);
  const content = (
      <div className="space-y-3">
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        {resolvedCanManage ? (
          <AttachmentUploadForm action={addDocumentAttachment.bind(null, documentId)} defaultLabel={defaultLabel} submitLabel={uploadLabel} />
        ) : null}
        <div className="divide-y border-t">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="grid gap-2 py-3">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="break-words text-xs font-medium">{attachment.file_name}</p>
                  <p className="text-xs text-muted-foreground">{attachment.file_type ?? "File"}</p>
                  <p className="text-xs text-muted-foreground">Uploaded by {actorLabel(attachment.uploaded_by_name)} - {formatDate(attachment.created_at)}</p>
                </div>
              </div>
              <div className="grid gap-2">
                {attachment.storage_path || attachment.file_url ? <div className="grid grid-cols-2 gap-2"><Button asChild variant="outline" size="sm" className="w-full justify-center"><a href={`/api/attachments/${attachment.id}`} target="_blank" rel="noreferrer">View</a></Button><Button asChild variant="outline" size="sm" className="w-full justify-center"><a href={`/api/attachments/${attachment.id}?download=1`}>Download</a></Button></div> : <Button type="button" variant="outline" size="sm" disabled className="w-full justify-center">File unavailable</Button>}
                {canRemoveAttachments ? <AttachmentRemoveAction action={archiveDocumentAttachment.bind(null, documentId, attachment.id)} fileName={attachment.file_name} /> : null}
              </div>
            </div>
          ))}
          {!attachments.length ? <EmptyAttachmentState /> : null}
        </div>
        {resolvedCanManage && attachments.length > 0 && !canRemoveAttachments ? (
          <p className="rounded-md border bg-secondary/40 p-2 text-xs text-muted-foreground">
            Attachments are locked after approval or posting to preserve the audit trail. Add the correct file as a new attachment instead.
          </p>
        ) : null}
      </div>
  );
  if (presentation === "inline") {
    return <section aria-label={title} className="rounded-[2px] border bg-card p-4"><h2 className="mb-2 text-sm font-semibold">{title}</h2>{content}</section>;
  }
  return <ConsoleSection title={title}>{content}</ConsoleSection>;
}

export function CommentsPanel({ documentId, comments }: { documentId: string; comments: Comment[] }) {
  return (
    <ConsoleSection title="Comments">
      <div className="space-y-3">
        <form action={addDocumentComment.bind(null, documentId)} className="space-y-2">
          <Textarea name="comment_text" placeholder="Add a comment for the document history" required className="min-h-[96px] w-full resize-none" />
          <SubmitButton type="submit" pendingLabel="Saving..." className="w-full justify-center">Add comment</SubmitButton>
        </form>
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-[2px] border bg-secondary/30 p-3">
              <p className="text-xs">{comment.comment_text}</p>
              <p className="mt-1 text-xs text-muted-foreground">{actorLabel(comment.created_by_name)} - {formatDate(comment.created_at)}</p>
            </div>
          ))}
          {!comments.length ? <p className="text-xs text-muted-foreground">No comments yet.</p> : null}
        </div>
      </div>
    </ConsoleSection>
  );
}

export function ApprovalPanel({ document, approval, approvalSteps }: { document: Document; approval: Approval; approvalSteps: ApprovalStep[] }) {
  return (
    <ConsoleSection title="Approval Panel">
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Current approver: {approvalSteps.find((step) => step.status === "pending")?.approver_role ?? "Not assigned"}</p>
          </div>
          <Badge variant={document.approval_status === "approved" ? "success" : document.approval_status === "rejected" ? "danger" : "secondary"}>{document.approval_status}</Badge>
        </div>
        <div className="grid gap-2">
          <form action={submitDocument.bind(null, document.id)}><SubmitButton type="submit" pendingLabel="Sending..." className="w-full justify-center">Submit for approval</SubmitButton></form>
          <form action={postDocument.bind(null, document.id)}><SubmitButton type="submit" variant="outline" pendingLabel="Posting..." className="w-full justify-center">Post</SubmitButton></form>
          <form action={cancelDocument.bind(null, document.id)}><SubmitButton type="submit" variant="ghost" pendingLabel="Processing..." className="w-full justify-center">Cancel</SubmitButton></form>
        </div>
        <form action={approveDocument.bind(null, document.id)} className="grid gap-2">
          <Input name="remarks" placeholder="Approval remarks" />
          <SubmitButton type="submit" pendingLabel="Approving..." className="w-full justify-center">Approve</SubmitButton>
        </form>
        <form action={rejectDocument.bind(null, document.id)} className="grid gap-2">
          <Input name="remarks" placeholder="Rejection remarks required" required />
          <SubmitButton type="submit" variant="destructive" pendingLabel="Rejecting..." className="w-full justify-center">Reject</SubmitButton>
        </form>
        <div className="rounded-[2px] border">
          {approvalSteps.map((step) => (
            <div key={step.id} className="flex flex-col gap-1 border-b p-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium">Step {step.step_no}: {step.approver_role ?? "Approver"}</p>
                <p className="text-xs text-muted-foreground">{step.remarks ?? "No remarks yet"}</p>
                <p className="text-xs text-muted-foreground">{actorLabel(step.acted_by_name)} - {formatDate(step.acted_at ?? step.updated_at)}</p>
              </div>
              <Badge variant={step.status === "approved" ? "success" : step.status === "rejected" ? "danger" : "secondary"}>{step.status}</Badge>
            </div>
          ))}
          {!approval && !approvalSteps.length ? <p className="p-3 text-center text-xs text-muted-foreground">No approval history yet.</p> : null}
        </div>
      </div>
    </ConsoleSection>
  );
}

export function RevisionPanel({ revisions }: { revisions: Revision[] }) {
  return (
    <ConsoleSection title="Revision History">
        <div className="divide-y rounded-[2px] border">
          {revisions.map((revision) => (
            <div key={revision.id} className="p-3">
              <p className="text-xs font-medium">Revision {revision.revision_no}</p>
              <p className="text-xs text-muted-foreground">{revision.change_summary}</p>
              <p className="mt-1 text-xs text-muted-foreground">{actorLabel(revision.changed_by_name)} - {formatDate(revision.changed_at)}</p>
            </div>
          ))}
          {!revisions.length ? <p className="p-3 text-center text-xs text-muted-foreground">No revisions yet.</p> : null}
        </div>
    </ConsoleSection>
  );
}
