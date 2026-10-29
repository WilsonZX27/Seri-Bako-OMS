"use client";
import { NativeDialog } from "@/components/ui/native-dialog";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clock3, FileUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { SelectControl } from "@/components/ui/select-control";
import { readJsonResponse } from "@/lib/http/read-json-response";
import { formatAttendanceTime } from "@/lib/attendance/time";

type Row = Record<string, unknown>;
type Props = {
  assignments: Row[];
  compPeople?: Row[];
  reports: Row[];
  ledger: Row[];
  balances: Record<string, number>;
  canSubmit: boolean;
  canApprove: boolean;
  canSubmitComp: boolean;
  canApproveComp: boolean;
  compact?: boolean;
  sections?: "all" | "reports" | "comp";
  hideBalances?: boolean;
  initialAssignmentId?: string;
  scheduleHref?: string;
};
const reportLabels: Record<string, string> = {
  mc: "Medical certificate (MC)",
  unpaid_leave: "Unpaid Leave · full day",
  emergency_leave: "Emergency leave",
  punch_correction: "Punch correction",
  other_exception: "Other exception",
};
function relation(row: Row, key: string) {
  return row[key] as {
    full_name?: string;
    staff_code?: string;
    branch_name?: string;
    file_name?: string;
  } | null;
}
function minutes(value: unknown) {
  const amount = Number(value ?? 0);
  return `${amount < 0 ? "−" : ""}${Math.abs(amount)} min`;
}

export function ActualAttendancePanel(props: Props) {
  const showReports = props.sections !== "comp";
  const showComp = props.sections !== "reports";
  const compPeople = [...new Map([
    ...props.assignments.map(row => [String(row.staff_id), {id:row.staff_id, ...relation(row, "staffs")}] as const),
    ...(props.compPeople ?? []).map(person => [String(person.id), person] as const),
  ]).values()];
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [reportDialog, setReportDialog] = useState<HTMLDialogElement | null>(null);
  const [compDialog, setCompDialog] = useState<HTMLDialogElement | null>(null);
  const decisionDialog = useRef<HTMLDialogElement>(null);
  const [decision, setDecision] = useState<{
    kind: "report" | "comp";
    id: string;
    decision: "approve" | "reject";
    requiresWaiver: boolean;
  } | null>(null);
  const [reportType, setReportType] = useState("mc");
  const [selectedAssignment, setSelectedAssignment] = useState(
    String(props.initialAssignmentId ?? props.assignments[0]?.id ?? ""),
  );
  useEffect(()=>{
    if(props.initialAssignmentId && reportDialog && props.assignments.some(row=>row.id===props.initialAssignmentId)) {
      const section=reportDialog.closest("details");if(section) section.open=true;
      if(!reportDialog.open) reportDialog.showModal();
    }
  },[props.initialAssignmentId,props.assignments,reportDialog]);
  function openReport(assignmentId?: string) {
    setSelectedAssignment(assignmentId ?? props.initialAssignmentId ?? String(props.assignments[0]?.id ?? ""));
    reportDialog?.showModal();
  }
  const selected = useMemo(
    () =>
      props.assignments.find((row) => String(row.id) === selectedAssignment),
    [props.assignments, selectedAssignment],
  );
  async function post(url: string, body: Row) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await readJsonResponse<{ ok: boolean; message?: string }>(
        response,
        {
          unexpectedResponse:
            "Attendance service returned an unexpected response.",
        },
      );
      if (!response.ok || !result.ok)
        throw new Error(result.message || "Attendance action failed.");
      const currentUrl=new URL(window.location.href);currentUrl.searchParams.delete("report");window.history.replaceState(null,"",currentUrl);
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Attendance action failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function submitReport(form: HTMLFormElement) {
    const data = new FormData(form);
    await post("/api/attendance/reports", {
      action: "submit",
      assignmentId: selectedAssignment,
      reportType,
      requestedMinutes: null,
      actualFirstIn:
        reportType === "punch_correction" && data.get("actualFirstIn")
          ? new Date(String(data.get("actualFirstIn"))).toISOString()
          : null,
      actualLastOut:
        reportType === "punch_correction" && data.get("actualLastOut")
          ? new Date(String(data.get("actualLastOut"))).toISOString()
          : null,
      reason: data.get("reason"),
      note: data.get("note") || null,
    });
  }
  const [creditToReverse, setCreditToReverse] = useState("");
  async function submitComp(form: HTMLFormElement) {
    const data = new FormData(form);
    if (creditToReverse) {
      await post("/api/attendance/comp-time", {action:"reconcileOt",claimId:creditToReverse,reason:data.get("reason"),note:data.get("note")||null});
      return;
    }
    await post("/api/attendance/comp-time", {
      action: "submit",
      staffId: data.get("staffId"),
      branchId: data.get("branchId") || null,
      workDate: data.get("workDate"),
      kind: data.get("kind"),
      minutes: Number(data.get("minutes")),
      reason: data.get("reason"),
      note: data.get("note") || null,
    });
  }
  async function uploadEvidence(reportId: string, file: File) {
    const form = new FormData();
    form.set("file", file);
    setBusy(true);
    const response = await fetch(
      `/api/attendance/reports/${reportId}/evidence`,
      { method: "POST", body: form },
    );
    const result = await readJsonResponse<{ ok: boolean; message?: string }>(
      response,
      {
        unexpectedResponse: "Evidence service returned an unexpected response.",
      },
    );
    setBusy(false);
    if (result.ok) window.location.reload();
    else setMessage(result.message ?? "Evidence upload failed.");
  }
  function openDecision(
    kind: "report" | "comp",
    id: string,
    value: "approve" | "reject",
    requiresWaiver = false,
  ) {
    setDecision({ kind, id, decision: value, requiresWaiver });
    requestAnimationFrame(() => decisionDialog.current?.showModal());
  }
  async function submitDecision(form: HTMLFormElement) {
    if (!decision) return;
    const data = new FormData(form);
    if (decision.kind === "report")
      await post("/api/attendance/reports", {
        action: "decide",
        reportId: decision.id,
        decision: decision.decision,
        comment: data.get("comment") || null,
        evidenceWaiverReason: data.get("waiver") || null,
      });
    else
      await post("/api/attendance/comp-time", {
        action: "decide",
        transactionId: decision.id,
        decision: decision.decision,
        comment: data.get("comment") || null,
      });
  }
  const pendingReports = props.reports.filter(
    (row) => row.status === "pending",
  );
  return (
    <div className="space-y-3" data-attendance-actuals>
      {showReports ? <section className="sb-work-surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--sb-border-soft)] p-3">
          <div>
            <h2 className="text-sm font-semibold">Daily attendance reports</h2>
            <p className="text-xs text-muted-foreground">
              Keep the published roster intact and explain what actually
              happened.
            </p>
          </div>
          <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">{pendingReports.length ? `${pendingReports.length} pending reports` : "No pending reports"}</span>
          {props.canSubmit ? (
            <Button
              size="sm"
              className="w-full"
              onClick={() => openReport()}
            >
              <Plus className="h-4 w-4" />
              New report
            </Button>
          ) : null}
          </div>
        </div>
        <div className="divide-y divide-[var(--sb-border-soft)]">
          {props.reports.map((row) => (
            <article
              key={String(row.id)}
              className={props.compact ? "grid gap-2 p-3 text-xs" : "grid gap-2 p-3 text-xs sm:grid-cols-[minmax(10rem,1fr)_9rem_9rem_minmax(12rem,1.4fr)_auto] sm:items-center"}
            >
              <div>
                <strong className="block text-sm">
                  {relation(row, "staffs")?.full_name ?? "Employee"}
                </strong>
                <span className="text-muted-foreground">
                  {String(row.work_date)} ·{" "}
                  {relation(row, "branches")?.branch_name ?? "Outlet"}
                </span>
              </div>
              <span>
                {reportLabels[String(row.report_type)] ??
                  String(row.report_type)}
              </span>
              <span>
                {row.requested_minutes ? minutes(row.requested_minutes) : "—"}
              </span>
              <div>
                <p>{String(row.reason)}</p>
                {relation(row, "attachments")?.file_name ? (
                  <p className="text-muted-foreground">
                    Evidence: {relation(row, "attachments")?.file_name}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <StatusBadge status={String(row.status)} />
                {row.report_type === "mc" &&
                row.status === "pending" &&
                !row.evidence_attachment_id ? (
                  <label className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-[var(--sb-radius-control)] border px-2 font-medium">
                    <FileUp className="h-3.5 w-3.5" />
                    Evidence
                    <input
                      className="sr-only"
                      type="file"
                      accept="application/pdf,image/png,image/jpeg,image/webp"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadEvidence(String(row.id), file);
                      }}
                    />
                  </label>
                ) : null}
                {props.canApprove && row.status === "pending" ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        openDecision(
                          "report",
                          String(row.id),
                          "approve",
                          row.report_type === "mc" &&
                            !row.evidence_attachment_id,
                        )
                      }
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        openDecision("report", String(row.id), "reject")
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </>
                ) : null}
              </div>
            </article>
          ))}
          {!props.reports.length ? (
            <p className="p-3 text-xs text-muted-foreground">
              No daily reports for this week.
            </p>
          ) : null}
        </div>
      </section> : null}
      {showComp ? <section className="sb-work-surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--sb-border-soft)] p-3">
          <div>
            <h2 className="text-sm font-semibold">{props.hideBalances ? "RO corrections" : "Time-off balance"}</h2>
            <p className="text-xs text-muted-foreground">
              Review balance corrections and their audit history.
            </p>
          </div>
          {props.canSubmitComp ? (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => compDialog?.showModal()}
            >
              <Clock3 className="h-4 w-4" />
              Add correction
            </Button>
          ) : null}
        </div>
        {!props.hideBalances ? <div className={props.compact ? "grid gap-px bg-[var(--sb-border-soft)]" : "grid gap-px bg-[var(--sb-border-soft)] sm:grid-cols-3"}>
          {Object.entries(props.balances).map(([staffId, balance]) => {
            const person = compPeople.find(row => String(row.id) === staffId);
            const ledgerPerson = props.ledger.find(row => String(row.staff_id) === staffId);
            return (
              <div key={staffId} className="bg-white p-3">
                <p className="text-xs text-muted-foreground">
                  {String(person?.full_name ?? relation(ledgerPerson ?? {}, "staffs")?.full_name ?? "Employee")}
                </p>
                <strong className="text-lg tabular-nums">{balance} min</strong>
              </div>
            );
          })}
          {!Object.keys(props.balances).length ? (
            <p className={props.compact ? "bg-white p-4 text-xs text-muted-foreground" : "bg-white p-4 text-xs text-muted-foreground sm:col-span-3"}>
              No approved comp time balance yet.
            </p>
          ) : null}
        </div> : null}
        <div className="divide-y divide-[var(--sb-border-soft)]">
          {props.ledger.slice(0, 50).map((row) => (
            <div
              key={String(row.id)}
              className="grid gap-3 p-3 text-xs sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0 space-y-1"><span className="block font-semibold">
                {relation(row, "staffs")?.full_name ?? "Employee"}
              </span>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><span>{String(row.transaction_kind)}</span>
              <strong
                className={
                  Number(row.minutes) < 0 ? "text-rose-700" : "text-emerald-800"
                }
              >
                {minutes(row.minutes)}
              </strong>
              <span className="min-w-0 flex-1 text-muted-foreground">
                {String(row.reason)}
              </span>
              </div></div><div className="flex flex-wrap items-center justify-end gap-2"><StatusBadge status={String(row.status)} />
              {props.canApproveComp && row.status === "pending" ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      openDecision("comp", String(row.id), "approve")
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      openDecision("comp", String(row.id), "reject")
                    }
                  >
                    Reject
                  </Button>
                </>
              ) : null}</div>
            </div>
          ))}
          {!props.ledger.length ? <p className="p-3 text-xs text-muted-foreground">No RO corrections for these employees.</p> : null}
        </div>
      </section> : null}
      {message ? (
        <p
          role="alert"
          className="rounded-[var(--sb-radius-control)] bg-rose-50 p-3 text-xs text-rose-800"
        >
          {message}
        </p>
      ) : null}
      <NativeDialog
        ref={setReportDialog}
        className="sb-dialog-workspace-centered m-auto max-h-[calc(100dvh-2rem)] w-[min(36rem,calc(100vw-2rem))] overflow-y-auto rounded-[var(--sb-panel-radius)] border-0 bg-white p-0 shadow-xl backdrop:bg-black/50"
      >
        <form
          className="space-y-4 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submitReport(event.currentTarget);
          }}
        >
          <div>
            <h2 className="text-base font-semibold">
              Report actual attendance
            </h2>
            <p className="text-xs text-muted-foreground">
              The approved schedule stays unchanged.
            </p>
          </div>
          <label className="grid gap-1 text-xs font-medium">
            Staff day
            {!props.assignments.length ? <p className="text-xs font-normal leading-5 text-muted-foreground">No published staff days for this week. <a className="font-medium underline" href={props.scheduleHref ?? "/attendance/schedule"}>Check and publish the schedule</a>.</p> : null}
            <SelectControl
              required
              ariaLabel="Staff day"
              value={selectedAssignment}
              onValueChange={setSelectedAssignment}
              searchable
              options={props.assignments.map((row) => ({
                value: String(row.id),
                label: `${relation(row, "staffs")?.full_name} · ${String(row.work_date)} · ${relation(row, "branches")?.branch_name}`,
              }))}
              portalContainer={reportDialog}
            />
          </label>
          {selected ? <div className="rounded-[var(--sb-radius-control)] bg-[var(--sb-surface-muted)] p-3 text-xs">
            <strong>Published schedule</strong>
            <p>
              {selected?.custom_start && selected?.custom_end
                ? `${formatAttendanceTime(String(selected.custom_start))}–${formatAttendanceTime(String(selected.custom_end))}`
                : formatAttendanceTime(
                    (
                      selected?.shift_templates as {
                        planned_start?: string;
                        planned_end?: string;
                      } | null
                    )?.planned_start,
                  ) +
                  "–" +
                  formatAttendanceTime(
                    (
                      selected?.shift_templates as {
                        planned_start?: string;
                        planned_end?: string;
                      } | null
                    )?.planned_end,
                  )}
            </p>
          </div> : null}
          <label className="grid gap-1 text-xs font-medium">
            Report type
            <SelectControl
              ariaLabel="Report type"
              value={reportType}
              onValueChange={setReportType}
              options={Object.entries(reportLabels).map(([value, label]) => ({
                value,
                label,
              }))}
              portalContainer={reportDialog}
            />
          </label>
          {reportType === "punch_correction" ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-xs font-medium">
                Actual first in
                <Input name="actualFirstIn" type="datetime-local" />
              </label>
              <label className="grid gap-1 text-xs font-medium">
                Actual last out
                <Input name="actualLastOut" type="datetime-local" />
              </label>
            </div>
          ) : null}
          <label className="grid gap-1 text-xs font-medium">
            Reason
            <textarea
              name="reason"
              required
              maxLength={1000}
              rows={3}
              className="rounded-[var(--sb-radius-control)] border px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium">
            <span>Note <span className="font-normal text-muted-foreground">(optional)</span></span>
            <textarea
              name="note"
              maxLength={1000}
              rows={2}
              className="rounded-[var(--sb-radius-control)] border px-3 py-2"
            />
          </label>
          <div className="sticky bottom-0 z-10 -mx-4 flex justify-end gap-2 border-t border-border bg-white px-4 py-3 sm:-mx-5 sm:px-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => reportDialog?.close()}
            >
              Cancel
            </Button>
            <Button disabled={busy || !selectedAssignment}>
              Submit report
            </Button>
          </div>
        </form>
      </NativeDialog>
      <NativeDialog
        ref={setCompDialog}
        className="sb-dialog-workspace-centered m-auto max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto rounded-[var(--sb-panel-radius)] border-0 bg-white p-0 shadow-xl backdrop:bg-black/50"
      >
        <form
          className="space-y-4 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submitComp(event.currentTarget);
          }}
        >
          <div>
            <h2 className="text-base font-semibold">
              Add RO balance correction
            </h2>
            <p className="text-xs text-muted-foreground">
              People may correct a verified historical or administrative
              discrepancy, or request reversal of an unused OT credit. A different People approver must confirm the reversal before punch times can change.
            </p>
          </div>
          <label className="grid gap-1 text-xs font-medium">
            Correction source
            <SelectControl ariaLabel="Correction source" value={creditToReverse || "balance"} onValueChange={(value)=>setCreditToReverse(value === "balance" ? "" : value)} portalContainer={compDialog} options={[{value:"balance",label:"General balance correction"}, ...props.ledger.filter((row)=>row.source_ot_claim_id && row.transaction_kind==="earned" && row.status==="approved" && !props.ledger.some((correction)=>correction.reverses_ot_claim_id===row.source_ot_claim_id && ["pending","approved"].includes(String(correction.status)))).map((row)=>({value:String(row.source_ot_claim_id),label:`${relation(row,"staffs")?.full_name ?? "Employee"} · ${row.work_date} · ${row.minutes} min OT`}))]} />
          </label>
          {creditToReverse ? <p className="text-xs text-muted-foreground">The selected credit will be fully reversed after approval. Used RO must be resolved first; no balance changes on submission.</p> : null}
          <fieldset disabled={Boolean(creditToReverse)} hidden={Boolean(creditToReverse)} className="space-y-3">
          <label className="grid gap-1 text-xs font-medium">
            Employee
            <SelectControl
              name="staffId"
              required
              ariaLabel="Employee"
              searchable
              options={[
                ...compPeople,
              ].map((row) => ({
                value: String(row.id),
                label: String(row.full_name ?? "Employee"),
              }))}
              portalContainer={compDialog}
            />
          </label>
          <label className="grid gap-1 text-xs font-medium">
            Outlet
            <SelectControl
              name="branchId"
              defaultValue="all"
              emptyValue="all"
              ariaLabel="Outlet"
              searchable
              options={[
                { value: "all", label: "Company-wide correction" },
                ...[
                  ...new Map(
                    props.assignments.map((row) => [
                      String(row.branch_id),
                      row,
                    ]),
                  ).values(),
                ].map((row) => ({
                  value: String(row.branch_id),
                  label: relation(row, "branches")?.branch_name ?? "Outlet",
                })),
              ]}
              portalContainer={compDialog}
            />
          </label>
          <input type="hidden" name="kind" value="correction" />
          <label className="grid gap-1 text-xs font-medium">
            Minutes
            <Input
              name="minutes"
              type="number"
              min={-1440}
              max={1440}
              step={30}
              required
            />
            <span className="font-normal text-muted-foreground">
              Use a positive value to add balance and a negative value to reduce
              it.
            </span>
          </label>
          <label className="grid gap-1 text-xs font-medium">
            Work date
            <Input name="workDate" type="date" required />
          </label>
          </fieldset>
          <label className="grid gap-1 text-xs font-medium">
            Reason
            <textarea
              name="reason"
              required
              rows={3}
              maxLength={1000}
              className="rounded-[var(--sb-radius-control)] border px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium">
            Note
            <textarea
              name="note"
              rows={2}
              maxLength={1000}
              className="rounded-[var(--sb-radius-control)] border px-3 py-2"
            />
          </label>
          <div className="sticky bottom-0 z-10 -mx-4 flex justify-end gap-2 border-t border-border bg-white px-4 py-3 sm:-mx-5 sm:px-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => compDialog?.close()}
            >
              Cancel
            </Button>
            <Button disabled={busy}>Submit correction</Button>
          </div>
        </form>
      </NativeDialog>
      <NativeDialog
        ref={decisionDialog}
        className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-[var(--sb-panel-radius)] border-0 bg-white p-0 shadow-xl backdrop:bg-black/50"
      >
        <form
          className="space-y-4 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submitDecision(event.currentTarget);
          }}
        >
          <div>
            <h2 className="text-base font-semibold">
              {decision?.decision === "approve" ? "Approve" : "Reject"}{" "}
              {decision?.kind === "comp"
                ? "comp time entry"
                : "attendance report"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Your identity, decision and comment will remain in the audit
              history.
            </p>
          </div>
          {decision?.requiresWaiver ? (
            <label className="grid gap-1 text-xs font-medium">
              MC evidence waiver reason
              <textarea
                name="waiver"
                required
                rows={3}
                maxLength={1000}
                className="rounded-[var(--sb-radius-control)] border px-3 py-2"
              />
            </label>
          ) : null}
          <label className="grid gap-1 text-xs font-medium">
            Decision comment{" "}
            {decision?.decision === "approve" ? (
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            ) : null}
            <textarea
              name="comment"
              required={decision?.decision === "reject"}
              rows={3}
              maxLength={1000}
              className="rounded-[var(--sb-radius-control)] border px-3 py-2"
            />
          </label>
          <div className="sticky bottom-0 z-10 -mx-4 flex justify-end gap-2 border-t border-border bg-white px-4 py-3 sm:-mx-5 sm:px-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => decisionDialog.current?.close()}
            >
              Cancel
            </Button>
            <Button disabled={busy}>
              {decision?.decision === "approve" ? "Approve" : "Reject"}
            </Button>
          </div>
        </form>
      </NativeDialog>
    </div>
  );
}
