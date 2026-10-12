"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { readJsonResponse } from "@/lib/http/read-json-response";

export function ShiftRequestButton({ assignmentId }: { assignmentId: string }) {
  const pendingRef = useRef(false);
  const reasonRef = useRef("");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; message: string } | null>(null);

  async function request() {
    if (pendingRef.current) return;
    const reason = window.prompt("Describe the shift change you need", reasonRef.current);
    if (!reason?.trim()) return;
    reasonRef.current = reason;
    pendingRef.current = true;
    setPending(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/attendance/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create", assignmentId, proposedStaffId: null, proposedTemplateId: null, reason }),
      });
      const result = await readJsonResponse<{ ok: boolean; message?: string }>(response, {
        sessionExpired: "Your session expired. Sign in again, then check your requests before retrying. Your reason is retained.",
        unexpectedResponse: "The service response could not be confirmed. Check your requests before retrying. Your reason is retained.",
        invalidJson: "The service response could not be read. Check your requests before retrying. Your reason is retained.",
      });
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Request failed. Check your requests before retrying.");
      setFeedback({ error: false, message: "Request sent for review." });
      reasonRef.current = "";
    } catch (error) {
      setFeedback({ error: true, message: error instanceof Error && !(error instanceof TypeError)
        ? error.message
        : "Unable to confirm the request. Check your connection and requests before retrying. Your reason is retained." });
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  return <div className="min-w-0 max-w-xs text-right">
    <Button size="sm" variant="ghost" disabled={pending} aria-busy={pending} onClick={() => void request()}>{pending ? "Sending…" : "Request change"}</Button>
    {feedback ? <p role={feedback.error ? "alert" : "status"} className={`mt-1 text-xs ${feedback.error ? "text-destructive" : "text-muted-foreground"}`}>{feedback.message}</p> : null}
  </div>;
}
