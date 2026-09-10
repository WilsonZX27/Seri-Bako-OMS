"use client";

import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Copy,
  MessageSquareText,
  Save,
  Send,
  Undo2,
  UserRound,
  X,
} from "lucide-react";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectControl } from "@/components/ui/select-control";
import { cn } from "@/lib/utils";
import { readJsonResponse } from "@/lib/http/read-json-response";
import {
  attendanceTimeOptions,
  formatAttendanceTime,
} from "@/lib/attendance/time";

type Branch = { id: string; branch_name: string };
type Person = {
  id: string;
  full_name: string;
  staff_code: string | null;
  employment_type: string;
  role_code: string;
};
type Template = {
  id: string;
  code: string;
  name: string;
  planned_start: string;
  planned_end: string;
  planned_break_seconds: number;
  maximum_recognised_seconds: number;
  colour: string;
};
type Assignment = {
  staff_id: string;
  work_date: string;
  assignment_kind: string;
  shift_template_id: string | null;
  custom_start?: string | null;
  custom_end?: string | null;
  custom_crosses_midnight?: boolean;
  custom_break_seconds?: number | null;
  custom_maximum_recognised_seconds?: number | null;
  custom_reason?: string | null;
  ro_minutes?: number | null;
  ro_original_start?: string | null;
  ro_original_end?: string | null;
  ro_direction?: string | null;
};
type Week = { id: string; status: string; updated_at?: string } | null;
type Palette = {
  key: string;
  label: string;
  kind: string;
  templateId?: string;
  tone: "work" | "off" | "al" | "ph" | "upl" | "ro" | "medical" | "custom";
};

const leavePalette: Palette[] = [
  { key: "off", label: "OFF", kind: "off", tone: "off" },
  { key: "al", label: "AL", kind: "al", tone: "al" },
  { key: "ph", label: "PH", kind: "ph", tone: "ph" },
  { key: "upl", label: "UPL", kind: "upl", tone: "upl" },
];

function addDays(day: string, amount: number) {
  const value = new Date(`${day}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}
function compactTime(value?: string | null) {
  return value?.slice(0, 5) ?? "";
}
function currentWeek() {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const value = new Date(`${day}T00:00:00Z`);
  return addDays(day, -((value.getUTCDay() + 6) % 7));
}
function currentDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}
function durationSeconds(start: string, end: string, crosses = false) {
  const [sh, sm] = start.split(":").map(Number),
    [eh, em] = end.split(":").map(Number);
  let value = (eh * 60 + em - sh * 60 - sm) * 60;
  if (crosses || value < 0) value += 86400;
  return Math.max(value, 0);
}
const timeOptions = attendanceTimeOptions();
function TimeSelect({
  label,
  value,
  onChange,
  portalContainer,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  portalContainer?: HTMLElement | null;
}) {
  return (
    <label className="grid gap-1 text-xs">
      <span>{label}</span>
      <SelectControl
        ariaLabel={label}
        value={value}
        onValueChange={onChange}
        options={timeOptions}
        className="tabular-nums"
        portalContainer={portalContainer}
      />
    </label>
  );
}
function shiftTime(value: string, minutes: number) {
  const [hours, mins] = value.split(":").map(Number),
    total = (hours * 60 + mins + minutes + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

type ValidationItem = {
  code: string;
  message: string;
  staffId?: string;
  staffName?: string;
  workDate?: string;
};
export function SchedulePlanner({
  branches,
  branchId,
  weekStart,
  week,
  previousWeekId,
  people,
  templates,
  initialAssignments,
  roBalances = {},
  canDraft,
  canSubmit,
  canApprove,
  initialWarnings,
  initialBlockers,
  rightRailDetails,
  headerContent,
}: {
  branches: Branch[];
  branchId: string;
  weekStart: string;
  week: Week;
  previousWeekId: string | null;
  people: Person[];
  templates: Template[];
  initialAssignments: Assignment[];
  roBalances?: Record<string, number>;
  canDraft: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  initialWarnings: ValidationItem[];
  initialBlockers: ValidationItem[];
  rightRailDetails: ReactNode;
  headerContent?: ReactNode;
}) {
  const dates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const initial = useMemo(
    () =>
      new Map(
        initialAssignments.map((a) => [`${a.staff_id}:${a.work_date}`, a]),
      ),
    [initialAssignments],
  );
  const [cells, setCells] = useState<Map<string, Assignment>>(initial);
  const [selectedMobileDate, setSelectedMobileDate] = useState(() =>
    dates.includes(currentDate()) ? currentDate() : dates[0],
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<Palette | null>(null);
  const [copied, setCopied] = useState<Assignment | null>(null);
  const [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [managerEditing, setManagerEditing] = useState(false),
    [decisionMode, setDecisionMode] = useState<"return" | "edit" | null>(null),
    [message, setMessage] = useState(
      people.length
        ? "Choose an assignment, then select staff days."
        : "No outlet employees are assigned here.",
    ),
    [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [custom, setCustom] = useState({
    start: "08:00",
    end: "16:30",
    breakMinutes: 60,
    capMinutes: 510,
    comment: "",
    templateId: null as string | null,
    originalStart: "08:00",
    originalEnd: "16:30",
    roMinutes: 0,
    roDirection: "late_start" as "late_start" | "early_finish",
  });
  const customDialog = useRef<HTMLDialogElement>(null);
  const customTitle = useRef<HTMLHeadingElement>(null);
  const decisionDialog = useRef<HTMLDialogElement>(null);
  const palette = useMemo<Palette[]>(
    () => [
      ...templates.map((template) => ({
        key: `shift:${template.id}`,
        label: `${template.code} · ${formatAttendanceTime(template.planned_start)}–${formatAttendanceTime(template.planned_end)}`,
        kind: "shift",
        templateId: template.id,
        tone: "work" as const,
      })),
      ...leavePalette,
    ],
    [templates],
  );

  function assignmentFor(
    staffId: string,
    workDate: string,
    item: Palette,
  ): Assignment {
    if (item.kind !== "shift")
      return {
        staff_id: staffId,
        work_date: workDate,
        assignment_kind: item.kind,
        shift_template_id: null,
      };
    return {
      staff_id: staffId,
      work_date: workDate,
      assignment_kind: "shift",
      shift_template_id: item.templateId ?? null,
      ...(!item.templateId
        ? {
            custom_start: custom.start,
            custom_end: custom.end,
            custom_crosses_midnight: custom.end <= custom.start,
            custom_break_seconds: custom.breakMinutes * 60,
            custom_maximum_recognised_seconds: custom.capMinutes * 60,
            custom_reason: custom.comment.trim() || "Outlet roster custom time",
          }
        : {}),
    };
  }
  function applyKeys(keys: Iterable<string>, item: Palette) {
    setCells((current) => {
      const next = new Map(current);
      for (const key of keys) {
        const [staffId, workDate] = key.split(":");
        next.set(key, assignmentFor(staffId, workDate, item));
      }
      return next;
    });
    setDirty(true);
  }
  function choose(item: Palette | null) {
    setActive(item);
    if (item && selected.size) {
      applyKeys(selected, item);
      setMessage(`${selected.size} selected days updated.`);
    }
  }
  function clickCell(key: string, event: React.MouseEvent) {
    if (!editableStatus || !canDraft) return;
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      setSelected((current) => {
        const next = new Set(current);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
      return;
    }
    setSelected(new Set([key]));
    if (active) {
      applyKeys([key], active);
      setMessage(`${active.label} assigned. Save draft when ready.`);
      return;
    }
    const existing = cells.get(key);
    if (existing?.assignment_kind === "shift") {
      const template = existing.shift_template_id
        ? templates.find((item) => item.id === existing.shift_template_id)
        : null;
      const originalStart =
          compactTime(
            existing.ro_original_start ??
              template?.planned_start ??
              existing.custom_start,
          ) || "08:00",
        originalEnd =
          compactTime(
            existing.ro_original_end ??
              template?.planned_end ??
              existing.custom_end,
          ) || "16:30";
      setCustom({
        start:
          compactTime(existing.custom_start ?? template?.planned_start) ||
          originalStart,
        end:
          compactTime(existing.custom_end ?? template?.planned_end) ||
          originalEnd,
        breakMinutes: Number(
          (template?.planned_break_seconds ??
            existing.custom_break_seconds ??
            3600) / 60,
        ),
        capMinutes: Number(
          (template?.maximum_recognised_seconds ??
            existing.custom_maximum_recognised_seconds ??
            30600) / 60,
        ),
        comment:
          existing.custom_reason === "Outlet roster custom time"
            ? ""
            : (existing.custom_reason ?? ""),
        templateId: existing.shift_template_id,
        originalStart,
        originalEnd,
        roMinutes: Number(existing.ro_minutes ?? 0),
        roDirection:
          existing.ro_direction === "early_finish"
            ? "early_finish"
            : "late_start",
      });
    } else {
      setCustom((value) => ({
        ...value,
        comment: "",
        templateId: null,
        roMinutes: 0,
        roDirection: "late_start",
        originalStart: value.start,
        originalEnd: value.end,
      }));
    }
    customDialog.current?.showModal();
    requestAnimationFrame(() =>
      customTitle.current?.focus({ preventScroll: true }),
    );
  }
  function clearSelected() {
    setCells((current) => {
      const next = new Map(current);
      for (const key of selected) next.delete(key);
      return next;
    });
    setDirty(true);
    setMessage("Selected days cleared.");
  }
  function cellSeconds(value?: Assignment) {
    if (!value || value.assignment_kind !== "shift") return 0;
    const template = value.shift_template_id
      ? templates.find((t) => t.id === value.shift_template_id)
      : null;
    const start = value.custom_start ?? template?.planned_start,
      end = value.custom_end ?? template?.planned_end,
      crosses =
        value.custom_crosses_midnight ??
        Boolean(template && template.planned_end <= template.planned_start);
    if (start && end)
      return Math.min(
        Math.max(
          durationSeconds(start, end, crosses) -
            Number(
              value.custom_break_seconds ??
                template?.planned_break_seconds ??
                0,
            ),
          0,
        ),
        Number(
          value.custom_maximum_recognised_seconds ??
            template?.maximum_recognised_seconds ??
            86400,
        ),
      );
    return 0;
  }
  async function requestAction(payload: Record<string, unknown>) {
    const response = await fetch("/api/attendance/schedule", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await readJsonResponse<{
      ok: boolean;
      message?: string;
      data?: unknown;
    }>(response, {
      unexpectedResponse:
        "Schedule service returned an unexpected response. Retry; no changes were applied.",
    });
    if (!response.ok || !result.ok)
      throw new Error(
        result.message || "Schedule action could not be completed.",
      );
    return result;
  }
  async function action(payload: Record<string, unknown>) {
    setBusy(true);
    setActionFeedback(null);
    try {
      await requestAction(payload);
      setDirty(false);
      setActionFeedback("Schedule updated.");
      window.location.reload();
    } catch (error) {
      const feedback =
        error instanceof Error ? error.message : "Schedule action failed.";
      setActionFeedback(feedback);
      setMessage(feedback);
    } finally {
      setBusy(false);
    }
  }
  async function submitCurrentSchedule() {
    setBusy(true);
    setActionFeedback(null);
    try {
      const result = (await requestAction({
        action: "submit",
        branchId,
        weekStart,
        assignments,
        expectedUpdatedAt: week?.updated_at ?? null,
      })) as { data?: { warnings?: Array<{ message: string }> } };
      const warnings = result.data?.warnings ?? [];
      setDirty(false);
      setActionFeedback(
        warnings.length
          ? `Schedule submitted with ${warnings.length} warning${warnings.length === 1 ? "" : "s"}.`
          : "Schedule submitted to Manager.",
      );
      window.location.reload();
    } catch (error) {
      const feedback =
        error instanceof Error
          ? error.message
          : "Schedule could not be submitted.";
      setActionFeedback(feedback);
      setMessage(`${feedback} Review the highlighted days, then retry.`);
    } finally {
      setBusy(false);
    }
  }
  const assignments = useMemo(() => [...cells.values()], [cells]),
    href = (value: string) =>
      `/attendance/schedule?branch=${encodeURIComponent(branchId)}&week=${value}`;
  const cellLabel = (value?: Assignment) => {
    if (!value) return "";
    if (value.assignment_kind === "oil") return "EL";
    if (value.assignment_kind !== "shift")
      return value.assignment_kind.toUpperCase();
    const template = value.shift_template_id
      ? templates.find((t) => t.id === value.shift_template_id)
      : null;
    const start = value.custom_start ?? template?.planned_start,
      end = value.custom_end ?? template?.planned_end;
    return start && end
      ? `${formatAttendanceTime(start)}–${formatAttendanceTime(end)}${value.ro_minutes ? ` · RO ${value.ro_minutes / 60}h` : ""}`
      : "Shift";
  };
  const cellTone = (value?: Assignment) =>
    !value
      ? "empty"
      : value.assignment_kind === "shift"
        ? "work"
        : value.assignment_kind === "mc" || value.assignment_kind === "oil"
          ? "medical"
          : value.assignment_kind;
  const editableStatus =
    !week ||
    ["draft", "returned", "rejected", "amendment_pending"].includes(
      week.status,
    ) ||
    managerEditing;
  function openDecision(mode: "return" | "edit") {
    setDecisionMode(mode);
    decisionDialog.current?.showModal();
  }
  async function submitDecision(form: HTMLFormElement) {
    if (!week || !decisionMode) return;
    const reason = String(new FormData(form).get("reason") ?? "").trim();
    if (!reason) return;
    if (decisionMode === "return")
      await action({
        action: "decide",
        weekId: week.id,
        decision: "return",
        comment: reason,
      });
    else if (week.updated_at)
      await action({
        action: "edit_and_publish",
        weekId: week.id,
        branchId,
        weekStart,
        assignments,
        expectedUpdatedAt: week.updated_at,
        reason,
      });
    else
      setActionFeedback("Reload this schedule before publishing corrections.");
  }
  const workflowActions = (
    <>
      <ConsoleSection title="Schedule actions" kind="action">
        <div className="grid gap-2">
          {editableStatus && canDraft ? (
            <Button
              className="w-full justify-start"
              size="sm"
              variant="outline"
              disabled={busy || !dirty}
              onClick={() =>
                void action({
                  action: "save",
                  branchId,
                  weekStart,
                  assignments,
                })
              }
            >
              <Save className="h-4 w-4" />
              {busy ? "Saving…" : "Save draft"}
            </Button>
          ) : null}
          {editableStatus && canSubmit ? (
            <Button
              className="w-full justify-start"
              size="sm"
              disabled={busy || !assignments.length}
              data-mobile-primary-action
              onClick={() => void submitCurrentSchedule()}
            >
              <Send className="h-4 w-4" />
              {busy
                ? "Submitting…"
                : canApprove
                  ? "Submit for publication"
                  : "Submit to Manager"}
            </Button>
          ) : null}
          {editableStatus && canDraft && previousWeekId ? (
            <Button
              className="w-full justify-start"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() =>
                void action({
                  action: "copy",
                  sourceWeekId: previousWeekId,
                  targetWeekStart: weekStart,
                })
              }
            >
              <Copy className="h-4 w-4" />
              Copy previous week
            </Button>
          ) : null}
          {canApprove && week?.status === "submitted" && !managerEditing ? (
            <>
              <Button
                className="w-full justify-start"
                size="sm"
                disabled={busy}
                data-mobile-primary-action
                onClick={() =>
                  void action({
                    action: "decide",
                    weekId: week.id,
                    decision: "approve",
                  })
                }
              >
                {busy ? "Publishing…" : "Approve & publish"}
              </Button>
              <Button
                className="w-full justify-start"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setManagerEditing(true);
                  setMessage(
                    "Manager editing is active. Select a staff day to make corrections.",
                  );
                }}
              >
                Edit schedule
              </Button>
              <Button
                className="w-full justify-start"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => openDecision("return")}
              >
                <Undo2 className="h-4 w-4" />
                Return to Supervisor
              </Button>
            </>
          ) : null}
          {managerEditing ? (
            <>
              <Button
                className="w-full justify-start"
                size="sm"
                disabled={busy || !dirty}
                data-mobile-primary-action
                onClick={() => openDecision("edit")}
              >
                {busy ? "Publishing…" : "Publish corrected schedule"}
              </Button>
              <Button
                className="w-full justify-start"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setCells(initial);
                  setDirty(false);
                  setManagerEditing(false);
                  setSelected(new Set());
                }}
              >
                Cancel corrections
              </Button>
            </>
          ) : null}
          {!editableStatus && week?.status !== "submitted" ? (
            <p className="text-xs text-muted-foreground">
              No action is required for this {week?.status.replaceAll("_", " ")}{" "}
              schedule.
            </p>
          ) : null}
          {initialBlockers.map((item) => (
            <p
              key={`${item.code}:${item.staffId ?? ""}:${item.workDate ?? ""}`}
              role="alert"
              className="rounded-[var(--sb-radius-control)] bg-rose-50 p-2 text-xs text-rose-900"
            >
              {item.message}
            </p>
          ))}
          {initialWarnings.map((item) => (
            <p
              key={`${item.code}:${item.staffId ?? ""}:${item.workDate ?? ""}`}
              className="rounded-[var(--sb-radius-control)] bg-[var(--sb-warning-bg)] p-2 text-xs text-amber-950"
            >
              {item.message} Submission remains available.
            </p>
          ))}
          {actionFeedback ? (
            <p
              role="status"
              className="rounded-[var(--sb-radius-control)] bg-[var(--sb-surface-muted)] p-2 text-xs"
            >
              {actionFeedback}
            </p>
          ) : null}
        </div>
      </ConsoleSection>
      {rightRailDetails}
    </>
  );
  const selectedDayValues = people.map((person) =>
    cells.get(`${person.id}:${selectedMobileDate}`),
  );
  const warnedStaff = new Set(
    [...initialWarnings, ...initialBlockers]
      .map((item) => item.staffId)
      .filter(Boolean),
  );
  const selectedDayStaff = selectedDayValues.filter(
    (value) => value?.assignment_kind === "shift",
  ).length;
  const selectedDayHours = selectedDayValues.reduce(
    (sum, value) => sum + cellSeconds(value),
    0,
  );
  return (
    <WorkspaceGrid
      rightRail={workflowActions}
      hideMobileConsole
      className="sb-schedule-workspace"
    >
      <div className="space-y-3" data-schedule-planner>
        {headerContent}
        <section className="overflow-hidden rounded-[var(--sb-panel-radius)] border border-[var(--sb-border-soft)] bg-white shadow-[var(--sb-shadow-card)]">
          <div
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-[var(--sb-border-soft)] px-3 py-2 sm:grid-cols-[minmax(12rem,1fr)_auto_auto]"
            data-schedule-period-controls
          >
            <label className="sr-only" htmlFor="schedule-outlet">
              Outlet
            </label>
            <SelectControl
              id="schedule-outlet"
              className="col-span-2 text-xs font-semibold sm:col-span-1"
              ariaLabel="Schedule outlet"
              value={branchId}
              onValueChange={(value) =>
                (window.location.href = `/attendance/schedule?branch=${encodeURIComponent(value)}&week=${weekStart}`)
              }
              options={branches.map((branch) => ({
                value: branch.id,
                label: branch.branch_name,
              }))}
              searchable
              searchPlaceholder="Search outlets"
            />
            <div className="flex h-10 min-w-0 items-center rounded-[var(--sb-radius-control)] border bg-white">
              <Button asChild size="icon" variant="ghost">
                <a
                  href={href(addDays(weekStart, -7))}
                  aria-label="Previous week"
                >
                  <ChevronLeft className="h-4 w-4" />
                </a>
              </Button>
              <span className="min-w-0 flex-1 px-1 text-center text-[11px] font-semibold tabular-nums sm:min-w-40 sm:px-2 sm:text-xs">
                {weekStart} – {dates[6]}
              </span>
              <Button asChild size="icon" variant="ghost">
                <a href={href(addDays(weekStart, 7))} aria-label="Next week">
                  <ChevronRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-10 border-amber-300 bg-amber-50 px-3 text-amber-950 hover:bg-amber-100"
            >
              <a href={href(currentWeek())}>Today</a>
            </Button>
          </div>
          {editableStatus && canDraft ? (
            <div
              className="flex min-h-14 flex-wrap items-center gap-2 px-3 py-2"
              aria-label="Shift palette"
            >
              <span className="shrink-0 text-xs font-semibold">
                Quick assign
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {leavePalette.map((item) => (
                  <Button
                    key={item.key}
                    type="button"
                    size="sm"
                    variant={active?.key === item.key ? "secondary" : "outline"}
                    className={cn(
                      "min-w-12 px-3 font-medium",
                      active?.key === item.key &&
                        "border-[var(--sb-green-300)] bg-[var(--sb-green-100)] text-[var(--sb-green-900)]",
                    )}
                    onClick={() => choose(active?.key === item.key ? null : item)}
                  >
                    {item.label}
                  </Button>
                ))}
                {palette.some((item) => item.kind === "shift") ? (
                  <SelectControl
                    className="w-full sm:w-[min(22rem,42vw)]"
                    ariaLabel="Shift template"
                    value={active?.kind === "shift" ? active.key : "none"}
                    onValueChange={(value) =>
                      choose(
                        value === "none"
                          ? null
                          : (palette.find((item) => item.key === value) ?? null),
                      )
                    }
                    options={[
                      { value: "none", label: "Working time" },
                      ...palette
                        .filter((item) => item.kind === "shift")
                        .map((item) => ({ value: item.key, label: item.label })),
                    ]}
                  />
                ) : null}
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={
                    !selected.size ||
                    ![...selected].some((key) => cells.has(key))
                  }
                  onClick={clearSelected}
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!selected.size}
                  onClick={() => setCopied(cells.get([...selected][0]) ?? null)}
                >
                  Copy
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!selected.size || !copied}
                  onClick={() => {
                    if (copied) {
                      setCells((current) => {
                        const next = new Map(current);
                        for (const key of selected) {
                          const [staff_id, work_date] = key.split(":");
                          next.set(key, { ...copied, staff_id, work_date });
                        }
                        return next;
                      });
                      setDirty(true);
                    }
                  }}
                >
                  Paste
                </Button>
              </div>
            </div>
          ) : null}
        </section>
        <section
          className="overflow-hidden border-y border-[var(--sb-border-soft)] bg-[var(--sb-surface-raised)] md:hidden"
          data-schedule-mobile-day
        >
          <div className="grid grid-cols-7 border-b border-[var(--sb-border-soft)] bg-[var(--sb-surface-muted)] p-1">
            {dates.map((date) => {
              const values = people.map((person) =>
                cells.get(`${person.id}:${date}`),
              );
              const staff = values.filter(
                (value) => value?.assignment_kind === "shift",
              ).length;
              const complete = values.length > 0 && values.every(Boolean);
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelectedMobileDate(date)}
                  className={cn(
                    "min-h-12 rounded-[var(--sb-radius-control)] px-0.5 py-1 text-center leading-tight",
                    complete && "bg-emerald-50 text-emerald-900",
                    selectedMobileDate === date &&
                      "text-[var(--sb-green-900)] ring-2 ring-[var(--sb-green-200)]",
                  )}
                >
                  <span className="block text-[10px] font-semibold uppercase">
                    {new Intl.DateTimeFormat("en-MY", {
                      weekday: "short",
                      timeZone: "UTC",
                    }).format(new Date(`${date}T00:00:00Z`))}
                  </span>
                  <span className="block text-[10px] text-current opacity-70">
                    {date.slice(8)}
                  </span>
                  <span
                    className="mt-1 flex items-center justify-center gap-0.5 text-[9px] font-semibold"
                    aria-label={`${staff} working staff${complete ? ", all assigned" : ""}`}
                  >
                    <UserRound className="h-2.5 w-2.5" aria-hidden="true" />
                    {staff}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="divide-y divide-[var(--sb-border-soft)] bg-white">
            {people.map((person) => {
              const key = `${person.id}:${selectedMobileDate}`,
                value = cells.get(key),
                tone = cellTone(value),
                weekly = dates.reduce(
                  (sum, date) =>
                    sum + cellSeconds(cells.get(`${person.id}:${date}`)),
                  0,
                );
              return (
                <div
                  key={person.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_minmax(5.5rem,auto)] items-center gap-2 px-3 py-2"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--sb-green-100)] text-[10px] font-bold text-[var(--sb-green-900)]">
                    {initials(person.full_name)}
                  </span>
                  <span className="min-w-0">
                    <strong className="flex items-center gap-1 truncate text-xs">
                      {person.full_name}
                      {warnedStaff.has(person.id) ? (
                        <AlertTriangle
                          className="h-3.5 w-3.5 shrink-0 text-amber-800"
                          aria-label="Schedule warning"
                        />
                      ) : null}
                    </strong>
                    <span className="block truncate text-[10px] text-[var(--sb-text)] opacity-70">
                      {person.role_code === "outlet_supervisor"
                        ? "Supervisor"
                        : "Staff"}{" "}
                      · {(weekly / 3600).toFixed(1)}h week
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={!editableStatus || !canDraft}
                    onClick={(event) => clickCell(key, event)}
                    className={cn(
                      "relative min-h-11 rounded-[var(--sb-radius-control)] border px-2 text-[11px] font-semibold",
                      tone === "empty" &&
                        "border-[var(--sb-border-soft)] text-[var(--sb-text)]",
                      tone === "work" &&
                        "border-emerald-200 bg-emerald-50 text-emerald-900",
                      tone === "off" &&
                        "border-slate-200 bg-slate-50 text-slate-700",
                      tone === "al" &&
                        "border-blue-200 bg-blue-50 text-blue-800",
                      tone === "ph" &&
                        "border-violet-200 bg-violet-50 text-violet-800",
                      tone === "upl" &&
                        "border-amber-200 bg-amber-50 text-amber-900",
                      tone === "ro" &&
                        "border-teal-200 bg-teal-50 text-teal-800",
                      tone === "medical" &&
                        "border-rose-200 bg-rose-50 text-rose-900",
                      selected.has(key) &&
                        "ring-2 ring-[var(--sb-green-700)] ring-offset-1",
                    )}
                    aria-label={`${person.full_name}, ${selectedMobileDate}: ${cellLabel(value) || "unassigned"}`}
                  >
                    {cellLabel(value) || "Add"}
                    {value?.custom_reason &&
                    value.custom_reason !== "Outlet roster custom time" ? (
                      <MessageSquareText
                        className="absolute right-1 top-1 h-3 w-3"
                        aria-label={`Comment: ${value.custom_reason}`}
                      />
                    ) : null}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between bg-[var(--sb-surface-muted)] px-3 py-2 text-xs">
            <strong>Daily coverage</strong>
            <span>
              <strong>{selectedDayStaff} staff</strong> ·{" "}
              {(selectedDayHours / 3600).toFixed(1)} hours
            </span>
          </div>
        </section>
        <div className="flex min-h-7 items-center justify-between gap-3 px-1 text-xs">
          <p
            className={
              dirty ? "font-medium text-amber-800" : "text-muted-foreground"
            }
          >
            {dirty ? "Unsaved changes will be saved when you submit." : message}
          </p>
          {selected.size > 1 ? (
            <span className="text-muted-foreground">
              {selected.size} cells selected
            </span>
          ) : null}
        </div>
        {(editableStatus && canDraft) ||
        (editableStatus && canSubmit && week) ||
        (canApprove && week?.status === "submitted") ? (
          <section
            className="grid grid-cols-2 gap-2 border-y border-[var(--sb-border-soft)] bg-[var(--sb-surface-raised)] p-3 md:hidden"
            data-schedule-mobile-actions
          >
            {editableStatus && canDraft ? (
              <Button
                size="sm"
                variant="outline"
                disabled={busy || !dirty}
                onClick={() =>
                  void action({
                    action: "save",
                    branchId,
                    weekStart,
                    assignments,
                  })
                }
              >
                <Save className="h-4 w-4" />
                {busy ? "Saving…" : "Save draft"}
              </Button>
            ) : null}
            {editableStatus && canSubmit ? (
              <Button
                size="sm"
                disabled={busy || !assignments.length}
                onClick={() => void submitCurrentSchedule()}
              >
                <Send className="h-4 w-4" />
                {busy ? "Submitting…" : "Submit"}
              </Button>
            ) : null}
            {canApprove && week?.status === "submitted" && !managerEditing ? (
              <>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void action({
                      action: "decide",
                      weekId: week.id,
                      decision: "approve",
                    })
                  }
                >
                  {busy ? "Publishing…" : "Approve & publish"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setManagerEditing(true);
                    setMessage("Manager editing is active.");
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => openDecision("return")}
                >
                  <Undo2 className="h-4 w-4" />
                  Return
                </Button>
              </>
            ) : null}
            {managerEditing ? (
              <>
                <Button
                  size="sm"
                  disabled={busy || !dirty}
                  onClick={() => openDecision("edit")}
                >
                  Publish changes
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setCells(initial);
                    setDirty(false);
                    setManagerEditing(false);
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : null}
          </section>
        ) : null}
        <section className="overflow-hidden rounded-[var(--sb-panel-radius)] border border-[var(--sb-border-soft)] bg-white shadow-[var(--sb-shadow-card)]">
          <div className="max-h-[calc(100dvh-17rem)] overflow-auto">
            <table className="w-full min-w-[70rem] border-separate border-spacing-0 text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-30 min-w-60 border-b border-r bg-[var(--sb-surface-muted)] px-3 py-2 text-left">
                    Outlet employee
                  </th>
                  {dates.map((d) => (
                    <th
                      key={d}
                      className="sticky top-0 z-20 min-w-32 border-b border-r bg-[var(--sb-surface-muted)] px-2 py-2 text-center"
                    >
                      <span className="block font-semibold">
                        {new Intl.DateTimeFormat("en-MY", {
                          weekday: "short",
                          timeZone: "UTC",
                        }).format(new Date(`${d}T00:00:00Z`))}
                      </span>
                      <span className="font-normal text-[var(--sb-text)] opacity-70">
                        {new Intl.DateTimeFormat("en-MY", {
                          day: "numeric",
                          month: "short",
                          timeZone: "UTC",
                        }).format(new Date(`${d}T00:00:00Z`))}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {people.map((person) => {
                  const weekly = dates.reduce(
                    (sum, date) =>
                      sum + cellSeconds(cells.get(`${person.id}:${date}`)),
                    0,
                  );
                  return (
                    <tr key={person.id}>
                      <th className="sticky left-0 z-10 border-b border-r bg-white px-3 py-2 text-left">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--sb-green-100)] text-[10px] font-bold text-[var(--sb-green-900)]">
                            {initials(person.full_name)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">
                              {person.full_name}
                            </span>
                            <span className="block truncate font-normal text-[var(--sb-text)] opacity-70">
                              {person.role_code === "outlet_supervisor"
                                ? "Supervisor"
                                : "Staff"}{" "}
                              · {person.employment_type.replace("_", " ")}
                            </span>
                          </span>
                          <span className="shrink-0 text-right text-[11px] font-semibold tabular-nums">
                            {(weekly / 3600).toFixed(1)}h
                          </span>
                        </div>
                      </th>
                      {dates.map((date) => {
                        const key = `${person.id}:${date}`,
                          value = cells.get(key),
                          tone = cellTone(value);
                        return (
                          <td key={date} className="border-b border-r p-1">
                            <button
                              type="button"
                              disabled={!editableStatus || !canDraft}
                              onClick={(event) => clickCell(key, event)}
                              aria-label={`${person.full_name}, ${date}: ${cellLabel(value) || "unassigned"}`}
                              className={cn(
                                "relative h-11 w-full rounded-[var(--sb-radius-control)] border px-1.5 text-xs font-semibold transition-colors disabled:cursor-default",
                                tone === "empty" &&
                                  "border-transparent text-[var(--sb-text)] opacity-70 enabled:hover:border-[var(--sb-border-soft)] enabled:hover:bg-[var(--sb-surface-muted)]",
                                tone === "work" &&
                                  "border-emerald-200 bg-emerald-50 text-emerald-900",
                                tone === "off" &&
                                  "border-slate-200 bg-slate-50 text-slate-700",
                                tone === "al" &&
                                  "border-blue-200 bg-blue-50 text-blue-800",
                                tone === "ph" &&
                                  "border-violet-200 bg-violet-50 text-violet-800",
                                tone === "upl" &&
                                  "border-amber-200 bg-amber-50 text-amber-900",
                                tone === "ro" &&
                                  "border-teal-200 bg-teal-50 text-teal-800",
                                tone === "medical" &&
                                  "border-rose-200 bg-rose-50 text-rose-900",
                                selected.has(key) &&
                                  "ring-2 ring-[var(--sb-green-700)] ring-offset-1",
                              )}
                            >
                              {cellLabel(value) || "Add"}
                              {value?.custom_reason &&
                              value.custom_reason !==
                                "Outlet roster custom time" ? (
                                <MessageSquareText
                                  className="absolute right-1 top-1 h-3 w-3"
                                  aria-label={`Comment: ${value.custom_reason}`}
                                />
                              ) : null}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <th className="sticky bottom-0 left-0 z-20 border-r border-t bg-[var(--sb-surface-muted)] px-3 py-2 text-left">
                    Daily coverage
                  </th>
                  {dates.map((date) => {
                    const values = people.map((person) =>
                      cells.get(`${person.id}:${date}`),
                    );
                    const staff = values.filter(
                        (value) => value?.assignment_kind === "shift",
                      ).length,
                      hours = values.reduce(
                        (sum, value) => sum + cellSeconds(value),
                        0,
                      );
                    return (
                      <td
                        key={date}
                        className="sticky bottom-0 border-r border-t bg-[var(--sb-surface-muted)] px-2 py-2 text-center"
                      >
                        <strong className="block">{staff} staff</strong>
                        <span className="text-[11px] text-[var(--sb-text)] opacity-70">
                          {(hours / 3600).toFixed(1)} hours
                        </span>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
        <dialog
          ref={customDialog}
          className="fixed left-1/2 top-1/2 m-0 max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-[var(--sb-panel-radius)] border-0 bg-white p-0 shadow-xl backdrop:bg-black/50"
        >
          <form method="dialog" className="space-y-4 p-4">
            <div>
              <h2
                ref={customTitle}
                tabIndex={-1}
                className="text-base font-semibold focus:outline-none"
              >
                Working time
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose the hours for the selected staff day.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TimeSelect
                label="Check in"
                value={custom.start}
                portalContainer={customDialog.current}
                onChange={(start) =>
                  setCustom((value) => ({
                    ...value,
                    start,
                    originalStart: value.roMinutes
                      ? value.originalStart
                      : start,
                  }))
                }
              />
              <TimeSelect
                label="Check out"
                value={custom.end}
                portalContainer={customDialog.current}
                onChange={(end) =>
                  setCustom((value) => ({
                    ...value,
                    end,
                    originalEnd: value.roMinutes ? value.originalEnd : end,
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-xs">
                Break (minutes)
                <Input
                  type="number"
                  min={0}
                  max={720}
                  step={1}
                  value={custom.breakMinutes}
                  onChange={(event) =>
                    setCustom((value) => ({
                      ...value,
                      breakMinutes: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label className="grid gap-1 text-xs">
                Maximum paid time (minutes)
                <Input
                  type="number"
                  min={1}
                  max={1440}
                  step={1}
                  value={custom.capMinutes}
                  onChange={(event) =>
                    setCustom((value) => ({
                      ...value,
                      capMinutes: Number(event.target.value),
                    }))
                  }
                />
              </label>
            </div>
            {selected.size === 1 &&
            people.find(
              (person) => person.id === [...selected][0].split(":")[0],
            )?.employment_type === "full_time" ? (
              <fieldset className="space-y-3 rounded-[var(--sb-radius-control)] border border-[var(--sb-border-soft)] p-3">
                <legend className="px-1 text-xs font-semibold">
                  Use approved RO
                </legend>
                <p className="text-xs text-[var(--sb-text-muted)]">
                  Available: {roBalances[[...selected][0].split(":")[0]] ?? 0}{" "}
                  minutes. The amount is reserved when the Manager publishes.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-1 text-xs">
                    Adjustment
                    <SelectControl
                      ariaLabel="RO adjustment direction"
                      portalContainer={customDialog.current}
                      value={custom.roDirection}
                      onValueChange={(direction) =>
                        setCustom((value) => {
                          const roDirection = direction as
                            | "late_start"
                            | "early_finish";
                          return {
                            ...value,
                            roDirection,
                            start:
                              roDirection === "late_start"
                                ? shiftTime(
                                    value.originalStart,
                                    value.roMinutes,
                                  )
                                : value.originalStart,
                            end:
                              roDirection === "early_finish"
                                ? shiftTime(value.originalEnd, -value.roMinutes)
                                : value.originalEnd,
                          };
                        })
                      }
                      options={[
                        { value: "late_start", label: "Start later" },
                        { value: "early_finish", label: "Finish earlier" },
                      ]}
                    />
                  </label>
                  <label className="grid gap-1 text-xs">
                    RO amount
                    <SelectControl
                      ariaLabel="RO amount"
                      portalContainer={customDialog.current}
                      value={String(custom.roMinutes)}
                      onValueChange={(amount) =>
                        setCustom((value) => {
                          const roMinutes = Number(amount);
                          return {
                            ...value,
                            roMinutes,
                            start:
                              value.roDirection === "late_start"
                                ? shiftTime(value.originalStart, roMinutes)
                                : value.originalStart,
                            end:
                              value.roDirection === "early_finish"
                                ? shiftTime(value.originalEnd, -roMinutes)
                                : value.originalEnd,
                          };
                        })
                      }
                      options={[
                        { value: "0", label: "No RO" },
                        ...Array.from(
                          {
                            length: Math.floor(
                              (roBalances[[...selected][0].split(":")[0]] ??
                                0) / 30,
                            ),
                          },
                          (_, index) => (index + 1) * 30,
                        ).map((value) => ({
                          value: String(value),
                          label: `${value} minutes`,
                        })),
                      ]}
                    />
                  </label>
                </div>
              </fieldset>
            ) : null}
            <label className="grid gap-1 text-xs">
              <span>
                Comment{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </span>
              <textarea
                value={custom.comment}
                maxLength={500}
                rows={2}
                onChange={(event) =>
                  setCustom((value) => ({
                    ...value,
                    comment: event.target.value,
                  }))
                }
                className="w-full resize-y rounded-[var(--sb-radius-control)] border border-[var(--sb-border)] bg-white px-3 py-2 text-sm"
                placeholder="Add context for this staff day"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="submit" variant="outline">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (selected.size) {
                    setCells((current) => {
                      const next = new Map(current);
                      for (const key of selected) {
                        const [staff_id, work_date] = key.split(":");
                        next.set(key, {
                          staff_id,
                          work_date,
                          assignment_kind: "shift",
                          shift_template_id: custom.templateId,
                          custom_start: custom.start,
                          custom_end: custom.end,
                          custom_crosses_midnight: custom.end <= custom.start,
                          custom_break_seconds: custom.breakMinutes * 60,
                          custom_maximum_recognised_seconds:
                            custom.capMinutes * 60,
                          custom_reason:
                            custom.comment.trim() ||
                            "Outlet roster custom time",
                          ro_minutes: custom.roMinutes || null,
                          ro_original_start: custom.roMinutes
                            ? custom.originalStart
                            : null,
                          ro_original_end: custom.roMinutes
                            ? custom.originalEnd
                            : null,
                          ro_direction: custom.roMinutes
                            ? custom.roDirection
                            : null,
                        });
                      }
                      return next;
                    });
                    setDirty(true);
                  }
                  setActive(null);
                  customDialog.current?.close();
                  setMessage(
                    custom.roMinutes
                      ? "Working time and RO use assigned. It will be reserved on publication."
                      : "Working time assigned.",
                  );
                }}
              >
                Assign working time
              </Button>
            </div>
          </form>
        </dialog>
        <dialog
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
                {decisionMode === "return"
                  ? "Return schedule to Supervisor"
                  : "Publish corrected schedule"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                The reason and your identity will remain in the schedule audit
                history.
              </p>
            </div>
            <label className="grid gap-1 text-xs font-medium">
              Reason
              <textarea
                name="reason"
                required
                autoFocus
                rows={4}
                maxLength={1000}
                className="rounded-[var(--sb-radius-control)] border border-[var(--sb-border)] px-3 py-2 text-sm"
              />
            </label>
            {actionFeedback ? (
              <p
                role="alert"
                className="rounded-[var(--sb-radius-control)] bg-rose-50 p-2 text-xs text-rose-900"
              >
                {actionFeedback}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => decisionDialog.current?.close()}
              >
                Cancel
              </Button>
              <Button disabled={busy}>
                {decisionMode === "return"
                  ? "Return schedule"
                  : "Publish changes"}
              </Button>
            </div>
          </form>
        </dialog>
      </div>
    </WorkspaceGrid>
  );
}
