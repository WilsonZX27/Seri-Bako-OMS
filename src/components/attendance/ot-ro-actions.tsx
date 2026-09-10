"use client";

import { useRef, useState } from "react";
import { Check, Clock3, LockKeyhole, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectControl } from "@/components/ui/select-control";
import { readJsonResponse } from "@/lib/http/read-json-response";

type Claim = {
  id: string;
  status: string;
  candidate_minutes: number;
  requested_minutes: number;
  decided_minutes: number | null;
};
type Reservation = {
  id: string;
  reserved_minutes: number;
  recommended_used_minutes: number | null;
  work_date: string;
  staffs?: { full_name?: string } | null;
};

async function post(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await readJsonResponse<{ ok: boolean; message?: string }>(
    response,
    {
      unexpectedResponse: "Attendance service returned an unexpected response.",
    },
  );
  if (!response.ok || !result.ok)
    throw new Error(
      result.message ?? "Attendance action could not be completed.",
    );
  return result;
}

export function OtClaimAction({
  resultId,
  candidateSeconds,
  claim,
  canSubmit,
  canApprove,
}: {
  resultId: string;
  candidateSeconds: number;
  claim?: Claim;
  canSubmit: boolean;
  canApprove: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState<string | null>(null),
    candidateMinutes = Math.floor(candidateSeconds / 1800) * 30;
  if (!candidateMinutes && !claim) return null;
  async function submit(form: HTMLFormElement, submitter: HTMLElement | null) {
    const data = new FormData(form),
      decision =
        submitter instanceof HTMLButtonElement ? submitter.value : "approve";
    setBusy(true);
    setMessage(null);
    try {
      await post(
        "/api/attendance/ot-claims",
        claim
          ? {
              action: "decide",
              claimId: claim.id,
              decision,
              decidedMinutes:
                decision === "approve"
                  ? Number(data.get("decidedMinutes") ?? 0)
                  : 0,
              comment: data.get("comment") || null,
            }
          : {
              action: "submit",
              resultId,
              requestedMinutes: Number(data.get("requestedMinutes")),
              reason: data.get("reason"),
              reviewNote: data.get("reviewNote") || null,
            },
      );
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "OT claim failed.");
    } finally {
      setBusy(false);
    }
  }
  const actionable =
    (!claim && canSubmit) || (claim?.status === "submitted" && canApprove);
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="w-full justify-start gap-2 px-2 font-normal"
        disabled={!actionable}
        onClick={() => dialog.current?.showModal()}
      >
        <Clock3 className="h-3.5 w-3.5" />
        {claim
          ? claim.status === "submitted"
            ? "Review OT"
            : claim.status
          : "Claim OT"}
      </Button>
      <dialog
        ref={dialog}
        className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-[var(--sb-panel-radius)] border-0 bg-white p-0 shadow-xl backdrop:bg-black/50"
      >
        <form
          className="space-y-4 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(event.currentTarget, event.nativeEvent.submitter);
          }}
        >
          <div>
            <h2 className="text-base font-semibold">
              {claim ? "People OT decision" : "Submit OT for People review"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Calculated candidate:{" "}
              {claim?.candidate_minutes ?? candidateMinutes} minutes. Only
              approved minutes become RO credit.
            </p>
          </div>
          {claim ? (
            <>
              <label className="grid gap-1 text-xs font-medium">
                Approved minutes
                <Input
                  name="decidedMinutes"
                  type="number"
                  min={30}
                  step={30}
                  max={claim.requested_minutes}
                  defaultValue={claim.requested_minutes}
                  required
                />
              </label>
              <label className="grid gap-1 text-xs font-medium">
                Decision comment
                <textarea
                  name="comment"
                  rows={3}
                  maxLength={1000}
                  className="rounded-[var(--sb-radius-control)] border px-3 py-2"
                  placeholder="Required when rejecting"
                />
              </label>
              <div className="flex justify-end gap-2">
                <Button
                  name="decision"
                  value="reject"
                  variant="ghost"
                  disabled={busy}
                >
                  <X className="h-4 w-4" />
                  Reject
                </Button>
                <Button name="decision" value="approve" disabled={busy}>
                  <Check className="h-4 w-4" />
                  Approve & credit RO
                </Button>
              </div>
            </>
          ) : (
            <>
              <label className="grid gap-1 text-xs font-medium">
                Requested minutes
                <Input
                  name="requestedMinutes"
                  type="number"
                  min={30}
                  step={30}
                  max={candidateMinutes}
                  defaultValue={candidateMinutes}
                  required
                />
              </label>
              <label className="grid gap-1 text-xs font-medium">
                Reason
                <textarea
                  name="reason"
                  required
                  rows={3}
                  maxLength={1000}
                  className="rounded-[var(--sb-radius-control)] border px-3 py-2"
                  defaultValue="Worked after the original published shift end"
                />
              </label>
              <label className="grid gap-1 text-xs font-medium">
                Review note{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
                <textarea
                  name="reviewNote"
                  rows={2}
                  maxLength={1000}
                  className="rounded-[var(--sb-radius-control)] border px-3 py-2"
                />
              </label>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => dialog.current?.close()}
                >
                  Cancel
                </Button>
                <Button disabled={busy}>Submit claim</Button>
              </div>
            </>
          )}
          {message ? (
            <p
              role="alert"
              className="rounded-[var(--sb-radius-control)] bg-rose-50 p-2 text-xs text-rose-800"
            >
              {message}
            </p>
          ) : null}
        </form>
      </dialog>
    </>
  );
}

export function WeeklyCloseButton({
  weekStart,
  reservations,
  disabled,
}: {
  weekStart: string;
  reservations: Reservation[];
  disabled?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState<string | null>(null);
  async function submit(form: HTMLFormElement) {
    const data = new FormData(form),
      roDecisions = reservations.map((row) => ({
        reservationId: row.id,
        finalUsedMinutes: Number(data.get(`ro:${row.id}`) ?? 0),
        note: String(data.get(`note:${row.id}`) ?? "") || null,
      }));
    setBusy(true);
    setMessage(null);
    try {
      await post("/api/attendance/weekly-close", {
        weekStart,
        branchId: null,
        roDecisions,
      });
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Week close failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        size="sm"
        className="w-full"
        disabled={disabled}
        onClick={() => dialog.current?.showModal()}
      >
        <LockKeyhole className="h-4 w-4" />
        Review & close week
      </Button>
      <dialog
        ref={dialog}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[min(44rem,calc(100vw-2rem))] overflow-auto rounded-[var(--sb-panel-radius)] border-0 bg-white p-0 shadow-xl backdrop:bg-black/50"
      >
        <form
          className="space-y-4 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(event.currentTarget);
          }}
        >
          <div>
            <h2 className="text-base font-semibold">Close attendance week</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              People must confirm every scheduled RO use. Closing locks the
              current calculation revisions.
            </p>
          </div>
          {reservations.length ? (
            <div className="divide-y rounded-[var(--sb-radius-control)] border">
              {reservations.map((row) => (
                <div
                  key={row.id}
                  className="grid gap-2 p-3 sm:grid-cols-[minmax(10rem,1fr)_9rem_minmax(12rem,1fr)] sm:items-end"
                >
                  <div>
                    <strong className="text-sm">
                      {row.staffs?.full_name ?? "Employee"}
                    </strong>
                    <p className="text-xs text-muted-foreground">
                      {row.work_date} · {row.reserved_minutes} min reserved
                    </p>
                  </div>
                  <label className="grid gap-1 text-xs font-medium">
                    Final RO used
                    <SelectControl
                      name={`ro:${row.id}`}
                      ariaLabel={`Final RO used for ${row.staffs?.full_name ?? "employee"}`}
                      defaultValue={String(row.recommended_used_minutes ?? 0)}
                      options={Array.from(
                        { length: row.reserved_minutes / 30 + 1 },
                        (_, index) => index * 30,
                      ).map((value) => ({
                        value: String(value),
                        label: `${value} min`,
                      }))}
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-medium">
                    Decision note
                    <Input
                      name={`note:${row.id}`}
                      placeholder="Optional audit note"
                    />
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-[var(--sb-radius-control)] bg-[var(--sb-surface-muted)] p-3 text-xs">
              No RO reservations require a decision this week.
            </p>
          )}
          {message ? (
            <p
              role="alert"
              className="rounded-[var(--sb-radius-control)] bg-rose-50 p-3 text-xs text-rose-800"
            >
              {message}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </Button>
            <Button disabled={busy}>
              {busy ? "Closing…" : "Confirm decisions & close"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
