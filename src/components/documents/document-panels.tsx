import Link from "next/link";
import { CheckCircle2, Clock, Eye, FileText, MessageSquare, Paperclip, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConsoleSection } from "@/components/layout/right-console";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { DestructiveActionDialog } from "@/components/ui/destructive-action-dialog";
import { AttachmentUploadForm } from "@/components/documents/attachment-upload-form";
import { AttachmentRemoveAction } from "@/components/documents/attachment-remove-action";
import { EmptyAttachmentState, EmptyTimelineState } from "@/components/ui/system-states";
import { Textarea } from "@/components/ui/textarea";
import {
  addDocumentAttachment,
  addDocumentComment,
  archiveDocumentComment,
  approveDocument,
  archiveDocumentAttachment,
  cancelDocument,
  postDocument,
  rejectDocument,
  submitDocument,
} from "@/server/actions/documents";
import { hasPermission } from "@/server/auth/permissions";
import { getDocument } from "@/server/queries/documents";
import { formatDateTime } from "@/lib/utils";
import type { Database } from "@/types/database";

type Document = Database["public"]["Tables"]["documents"]["Row"] & { created_by_name?: string | null; updated_by_name?: string | null };
type Attachment = Database["public"]["Tables"]["attachments"]["Row"] & { uploaded_by_name?: string | null; created_by_name?: string | null; source_document_id?: string; source_number?: string; source_kind?: string; source_href?: string };
type Comment = Database["public"]["Tables"]["document_comments"]["Row"] & { created_by_name?: string | null };
type Revision = Database["public"]["Tables"]["document_revisions"]["Row"] & { changed_by_name?: string | null };
type Approval = Database["public"]["Tables"]["approvals"]["Row"] | null;
type ApprovalStep = Database["public"]["Tables"]["approval_steps"]["Row"] & { acted_by_name?: string | null; approver_staff_name?: string | null };
type Activity = Pick<Database["public"]["Tables"]["activity_logs"]["Row"], "id" | "activity_type" | "message" | "created_at" | "created_by"> & { created_by_name?: string | null };
export type TimelineEvent = Pick<Activity, "id" | "activity_type" | "message" | "created_at"> & { created_by_name?: string | null };

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

export function TimelineEventList({ events }: { events: TimelineEvent[] }) {
  return <div className="space-y-0">
    {events.map((event) => <div key={event.id} className="relative ml-2 flex gap-3 border-l border-[var(--sb-border-soft)] pb-4 pl-4 last:pb-0">
      <div className="-ml-[25px] mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--rail-bg)]">{eventIcon(event.activity_type)}</div>
      <div className="min-w-0"><p className="text-xs font-medium">{event.message}</p><p className="text-xs text-muted-foreground">{actorLabel(event.created_by_name)} - {formatDateTime(event.created_at)}</p></div>
    </div>)}
    {!events.length ? <EmptyTimelineState /> : null}
  </div>;
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
      <TimelineEventList events={events} />
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
  required = false,
  canRemove = false,
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
  required?: boolean;
  canRemove?: boolean;
}) {
  const [resolvedCanManage, resolvedDocument] = await Promise.all([
    canManage === undefined ? hasPermission("documents.attach") : Promise.resolve(canManage),
    documentStatus === undefined ? getDocument(documentId) : Promise.resolve(null),
  ]);
  const status = documentStatus ?? resolvedDocument?.status ?? "draft";
  const canRemoveAttachments = resolvedCanManage && (canRemove || ["draft", "pending_approval"].includes(status));
  const content = (
      <div className="space-y-3">
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        {resolvedCanManage ? (
          <AttachmentUploadForm action={addDocumentAttachment.bind(null, documentId)} defaultLabel={defaultLabel} submitLabel={uploadLabel ?? "Upload"} />
        ) : null}
        <div className="divide-y border-t">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="flex min-w-0 items-start gap-3 py-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="break-words text-xs font-medium">{attachment.file_name}</p>
                  {attachment.source_href && attachment.source_number ? <p className="mt-0.5 text-[11px]"><Link href={attachment.source_href} className="font-medium text-[var(--sb-link)] underline-offset-4 hover:underline">{attachment.source_kind} {attachment.source_number}</Link></p> : null}
                  <p className="text-xs text-muted-foreground">Uploaded by {actorLabel(attachment.uploaded_by_name)} - {formatDateTime(attachment.created_at)}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {attachment.storage_path || attachment.file_url ? <Button asChild variant="ghost" size="icon" className="h-8 w-8"><a href={`/api/attachments/${attachment.id}`} target="_blank" rel="noreferrer" aria-label={`View ${attachment.file_name}`} title="View attachment"><Eye className="h-4 w-4" /></a></Button> : <Button type="button" variant="ghost" size="icon" disabled className="h-8 w-8" aria-label="File unavailable"><FileText className="h-4 w-4" /></Button>}
                {canRemoveAttachments ? <AttachmentRemoveAction action={archiveDocumentAttachment.bind(null, attachment.source_document_id ?? documentId, attachment.id)} fileName={attachment.file_name} /> : null}
              </div>
            </div>
          ))}
          {!attachments.length ? <EmptyAttachmentState /> : null}
        </div>
      </div>
  );
  if (presentation === "inline") {
    return <section aria-label={title} className="rounded-[var(--sb-panel-radius)] border bg-card p-4"><h2 className="mb-2 text-sm font-semibold">{title}{required ? <span className="text-[var(--sb-danger)]"> *</span> : null}</h2>{content}</section>;
  }
  return <ConsoleSection title={required ? <>{title} <span className="text-[var(--sb-danger)]">*</span></> : title}>{content}</ConsoleSection>;
}

export function CommentsPanel({ documentId, comments, canRemove = false }: { documentId: string; comments: Comment[]; canRemove?: boolean }) {
  return (
    <ConsoleSection title="Comments">
      <div className="space-y-3">
        <form action={addDocumentComment.bind(null, documentId)} className="space-y-2">
          <Textarea name="comment_text" aria-label="Add a comment" placeholder="Add a comment" required className="min-h-20 w-full resize-none text-[13px] leading-5" />
          <SubmitButton type="submit" pendingLabel="Saving..." className="w-full justify-center">Add comment</SubmitButton>
        </form>
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2 rounded-[var(--sb-panel-radius)] border bg-secondary/30 p-3">
              <div className="min-w-0 flex-1"><p className="break-words text-xs">{comment.comment_text}</p><p className="mt-1 text-xs text-muted-foreground">{actorLabel(comment.created_by_name)} - {formatDateTime(comment.created_at)}</p></div>
              {canRemove ? <AttachmentRemoveAction action={archiveDocumentComment.bind(null, documentId, comment.id)} fileName="This comment" itemType="comment" /> : null}
            </div>
          ))}
          {!comments.length ? <p className="text-xs text-muted-foreground">No comments yet.</p> : null}
        </div>
      </div>
    </ConsoleSection>
  );
}

export async function ApprovalPanel({ document, approval, approvalSteps }: { document: Document; approval: Approval; approvalSteps: ApprovalStep[] }) {
  const [canSubmit, canApprove, canUpdate] = await Promise.all([hasPermission("documents.submit"), hasPermission("documents.approve"), hasPermission("documents.update")]);
  const canReview = canApprove && document.status === "pending_approval";
  return (
    <ConsoleSection title="Next action">
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Current approver: {approvalSteps.find((step) => step.status === "pending")?.approver_role ?? "Not assigned"}</p>
          </div>
          <Badge variant={document.approval_status === "approved" ? "success" : document.approval_status === "rejected" ? "danger" : "secondary"}>{document.approval_status}</Badge>
        </div>
        <div className="grid gap-2">
          {canSubmit && ["draft", "rejected"].includes(document.status) ? <form action={submitDocument.bind(null, document.id)}><SubmitButton type="submit" pendingLabel="Sending..." className="w-full justify-center">Submit for approval</SubmitButton></form> : null}
          {canUpdate && document.status === "approved" ? <form action={postDocument.bind(null, document.id)}><SubmitButton type="submit" variant="outline" pendingLabel="Posting..." className="w-full justify-center">Post</SubmitButton></form> : null}
          {canUpdate && !["posted", "closed", "cancelled"].includes(document.status) ? <details><summary className="min-h-11 cursor-pointer py-3 text-xs">Other actions</summary><DestructiveActionDialog action={cancelDocument.bind(null, document.id)} label="Cancel document" title="Cancel this document?" description="The document will stop progressing through its current workflow." pendingLabel="Cancelling..." /></details> : null}
        </div>
        {canReview ? <><form action={approveDocument.bind(null, document.id)} className="grid gap-2">
          <Input name="remarks" aria-label="Approval remarks" placeholder="Approval remarks" />
          <SubmitButton type="submit" pendingLabel="Approving..." className="w-full justify-center">Approve</SubmitButton>
        </form>
        <DestructiveActionDialog action={rejectDocument.bind(null, document.id)} label="Reject" title="Reject this document?" description="The document will return for correction and cannot progress until resubmitted." pendingLabel="Rejecting..."><Input name="remarks" aria-label="Rejection remarks" placeholder="Rejection remarks required" required /></DestructiveActionDialog></> : <p className="text-xs text-muted-foreground">{document.status === "submitted" ? "Submitted · awaiting workflow assignment." : "Only actions available at this stage are shown."}</p>}
        <details><summary className="min-h-11 cursor-pointer py-3 text-xs">Approval history</summary><div className="rounded-[var(--sb-panel-radius)] border">
          {approvalSteps.map((step) => (
            <div key={step.id} className="flex flex-col gap-1 border-b p-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium">Step {step.step_no}: {step.approver_role ?? "Approver"}</p>
                <p className="text-xs text-muted-foreground">{step.remarks ?? "No remarks yet"}</p>
                <p className="text-xs text-muted-foreground">{actorLabel(step.acted_by_name)} - {formatDateTime(step.acted_at ?? step.updated_at)}</p>
              </div>
              <Badge variant={step.status === "approved" ? "success" : step.status === "rejected" ? "danger" : "secondary"}>{step.status}</Badge>
            </div>
          ))}
          {!approval && !approvalSteps.length ? <p className="p-3 text-center text-xs text-muted-foreground">No approval history yet.</p> : null}
        </div></details>
      </div>
    </ConsoleSection>
  );
}

export function RevisionPanel({ revisions }: { revisions: Revision[] }) {
  return (
    <ConsoleSection title="Revision History">
        <div className="divide-y rounded-[var(--sb-panel-radius)] border">
          {revisions.map((revision) => (
            <div key={revision.id} className="p-3">
              <p className="text-xs font-medium">Revision {revision.revision_no}</p>
              <p className="text-xs text-muted-foreground">{revision.change_summary}</p>
              <p className="mt-1 text-xs text-muted-foreground">{actorLabel(revision.changed_by_name)} - {formatDateTime(revision.changed_at)}</p>
            </div>
          ))}
          {!revisions.length ? <p className="p-3 text-center text-xs text-muted-foreground">No revisions yet.</p> : null}
        </div>
    </ConsoleSection>
  );
}
