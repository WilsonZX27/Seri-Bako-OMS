import { CheckCircle2, Clock, FileText, MessageSquare, Paperclip, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import type { Database } from "@/types/database";

type Document = Database["public"]["Tables"]["documents"]["Row"];
type Attachment = Database["public"]["Tables"]["attachments"]["Row"];
type Comment = Database["public"]["Tables"]["document_comments"]["Row"];
type Revision = Database["public"]["Tables"]["document_revisions"]["Row"];
type Approval = Database["public"]["Tables"]["approvals"]["Row"] | null;
type ApprovalStep = Database["public"]["Tables"]["approval_steps"]["Row"];
type Activity = Pick<Database["public"]["Tables"]["activity_logs"]["Row"], "id" | "activity_type" | "message" | "created_at" | "created_by">;

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-";
}

function formatBytes(value: number) {
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
}

function eventIcon(type: string) {
  if (["approved", "posted"].includes(type)) return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (["rejected", "cancelled"].includes(type)) return <XCircle className="h-4 w-4 text-destructive" />;
  if (type.includes("comment")) return <MessageSquare className="h-4 w-4 text-primary" />;
  if (type.includes("attachment")) return <Paperclip className="h-4 w-4 text-primary" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

export function DocumentTimeline({ document, activities, comments, attachments }: { document: Document; activities: Activity[]; comments: Comment[]; attachments: Attachment[] }) {
  const syntheticEvents = [
    { id: "created", activity_type: "created", message: "Document created", created_at: document.created_at, created_by: document.created_by },
    ...(document.updated_at !== document.created_at ? [{ id: "updated", activity_type: "updated", message: "Document updated", created_at: document.updated_at, created_by: document.updated_by }] : []),
    ...(document.submitted_at ? [{ id: "submitted", activity_type: "submitted", message: "Document submitted", created_at: document.submitted_at, created_by: document.created_by }] : []),
    ...(document.posted_at ? [{ id: "posted", activity_type: "posted", message: "Document posted", created_at: document.posted_at, created_by: document.updated_by }] : []),
    ...(document.cancelled_at ? [{ id: "cancelled", activity_type: "cancelled", message: "Document cancelled", created_at: document.cancelled_at, created_by: document.updated_by }] : []),
  ];
  const commentEvents = comments.map((comment) => ({ id: comment.id, activity_type: "comment_added", message: comment.comment_text, created_at: comment.created_at, created_by: comment.created_by }));
  const attachmentEvents = attachments.map((attachment) => ({ id: attachment.id, activity_type: "attachment_uploaded", message: `${attachment.file_name} uploaded`, created_at: attachment.uploaded_at, created_by: attachment.uploaded_by }));
  const events = [...syntheticEvents, ...activities, ...commentEvents, ...attachmentEvents]
    .filter((event, index, rows) => rows.findIndex((row) => row.activity_type === event.activity_type && row.created_at === event.created_at && row.message === event.message) === index)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-sm font-semibold">Document Timeline</h2>
        <div className="mt-4 space-y-4">
          {events.map((event) => (
            <div key={event.id} className="flex gap-3">
              <div className="mt-0.5">{eventIcon(event.activity_type)}</div>
              <div>
                <p className="text-sm font-medium">{event.message}</p>
                <p className="text-xs text-muted-foreground">{formatDate(event.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function AttachmentPanel({ documentId, attachments }: { documentId: string; attachments: Attachment[] }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <h2 className="text-sm font-semibold">Attachments</h2>
        <form action={addDocumentAttachment.bind(null, documentId)} className="grid gap-3 md:grid-cols-4">
          <Field label="File Name"><Input name="file_name" placeholder="invoice.pdf" required /></Field>
          <Field label="File Type"><Input name="file_type" placeholder="application/pdf" /></Field>
          <Field label="File Size"><Input name="file_size" type="number" min="0" defaultValue={0} /></Field>
          <Field label="File URL"><Input name="file_url" placeholder="https://..." /></Field>
          <div className="md:col-span-4"><Button type="submit" variant="secondary">Upload attachment</Button></div>
        </form>
        <div className="divide-y rounded-lg border">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{attachment.file_name}</p>
                  <p className="text-xs text-muted-foreground">{attachment.file_type ?? "file"} - {formatBytes(attachment.file_size)} - {formatDate(attachment.uploaded_at)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm"><a href={attachment.file_url ?? "#"}>Download</a></Button>
                <form action={archiveDocumentAttachment.bind(null, documentId, attachment.id)}><Button variant="ghost" size="sm">Archive</Button></form>
              </div>
            </div>
          ))}
          {!attachments.length ? <p className="p-4 text-center text-sm text-muted-foreground">No attachments yet.</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function CommentsPanel({ documentId, comments }: { documentId: string; comments: Comment[] }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <h2 className="text-sm font-semibold">Comments</h2>
        <form action={addDocumentComment.bind(null, documentId)} className="space-y-3">
          <Textarea name="comment_text" placeholder="Add a comment for the document history" required />
          <Button type="submit" variant="secondary">Add comment</Button>
        </form>
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-lg border bg-secondary/30 p-3">
              <p className="text-sm">{comment.comment_text}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatDate(comment.created_at)}</p>
            </div>
          ))}
          {!comments.length ? <p className="text-sm text-muted-foreground">No comments yet.</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function ApprovalPanel({ document, approval, approvalSteps }: { document: Document; approval: Approval; approvalSteps: ApprovalStep[] }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Approval Panel</h2>
            <p className="text-xs text-muted-foreground">Current approver: {approvalSteps.find((step) => step.status === "pending")?.approver_role ?? "Not assigned"}</p>
          </div>
          <Badge variant={document.approval_status === "approved" ? "success" : document.approval_status === "rejected" ? "danger" : "secondary"}>{document.approval_status}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={submitDocument.bind(null, document.id)}><Button type="submit" variant="secondary">Submit for approval</Button></form>
          <form action={postDocument.bind(null, document.id)}><Button type="submit" variant="outline">Post</Button></form>
          <form action={cancelDocument.bind(null, document.id)}><Button type="submit" variant="ghost">Cancel</Button></form>
        </div>
        <form action={approveDocument.bind(null, document.id)} className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input name="remarks" placeholder="Approval remarks" />
          <Button type="submit">Approve</Button>
        </form>
        <form action={rejectDocument.bind(null, document.id)} className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input name="remarks" placeholder="Rejection remarks required" required />
          <Button type="submit" variant="destructive">Reject</Button>
        </form>
        <div className="rounded-lg border">
          {approvalSteps.map((step) => (
            <div key={step.id} className="flex flex-col gap-1 border-b p-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Step {step.step_no}: {step.approver_role ?? "Approver"}</p>
                <p className="text-xs text-muted-foreground">{step.remarks ?? "No remarks yet"}</p>
              </div>
              <Badge variant={step.status === "approved" ? "success" : step.status === "rejected" ? "danger" : "secondary"}>{step.status}</Badge>
            </div>
          ))}
          {!approval && !approvalSteps.length ? <p className="p-4 text-center text-sm text-muted-foreground">No approval history yet.</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function RevisionPanel({ revisions }: { revisions: Revision[] }) {
  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-sm font-semibold">Revision History</h2>
        <div className="mt-4 divide-y rounded-lg border">
          {revisions.map((revision) => (
            <div key={revision.id} className="p-3">
              <p className="text-sm font-medium">Revision {revision.revision_no}</p>
              <p className="text-sm text-muted-foreground">{revision.change_summary}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatDate(revision.changed_at)}</p>
            </div>
          ))}
          {!revisions.length ? <p className="p-4 text-center text-sm text-muted-foreground">No revisions yet.</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
