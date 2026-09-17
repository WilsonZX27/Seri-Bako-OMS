import type { ReactNode } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SelectControl } from "@/components/ui/select-control";
import { EmptyState } from "@/components/ui/empty-state";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getStaff,
  getStaffProfileSummary,
  getStaffSensitiveEmployment,
} from "@/server/queries/foundation";
import { updateStaffSensitiveEmployment } from "@/server/actions/foundation";
import {
  getPeopleCompliance,
  getPeopleComplianceTypes,
} from "@/server/queries/compliance";
import { createComplianceRecord } from "@/server/actions/compliance";
import { getPermissionMap } from "@/server/auth/permissions";
import { detailOrNotFound } from "@/server/queries/detail";
import { getStaffAttendanceTracking, getStaffCompTime } from "@/server/queries/attendance";
import { CompTimeCorrectionForm } from "@/components/attendance/comp-time-correction-form";

type ProfileSectionId = "overview" | "employment" | "compliance";
export default async function PeopleProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ section?: string; error?: string; success?: string }>;
}) {
  const { id } = await params;
  const permissions = await getPermissionMap([
    "people.compliance.manage",
    "people.compliance.document.read",
    "people.sensitive.read",
    "people.sensitive.manage",
    "comp_time.submit",
  ]);
  const [
    message,
    staff,
    staffSummary,
    compliance,
    complianceTypes,
    compTime,
    attendanceTracking,
    sensitive,
  ] = await Promise.all([
    searchParams,
    detailOrNotFound(getStaff(id)),
    getStaffProfileSummary(id),
    getPeopleCompliance(id),
    getPeopleComplianceTypes(),
    getStaffCompTime(id),
    getStaffAttendanceTracking(id),
    permissions["people.sensitive.read"]
      ? getStaffSensitiveEmployment(id)
      : Promise.resolve(null),
  ]);
  const { section } = message;
  const activeSection: ProfileSectionId =
    section === "documents"
      ? "compliance"
      : ["overview", "employment", "compliance"].includes(section ?? "")
        ? (section as ProfileSectionId)
        : "overview";
  const attention = compliance.filter(
    (record) => record.state !== "valid",
  ).length;
  const rail = (
    <>
      <ConsoleSection title="Actions">
        <Button asChild size="sm" className="w-full" data-mobile-primary-action>
          <Link href={`/staffs/${staff.id}`}>Manage account & access</Link>
        </Button>
      </ConsoleSection>
      <ConsoleSection title="Profile status">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Employment</span>
          <StatusBadge status={staff.status} />
        </div>
        <div className="flex items-center justify-between border-t pt-2">
          <span className="text-muted-foreground">Compliance</span>
          <strong>
            {attention
              ? `${attention} need attention`
              : "All requirements valid"}
          </strong>
        </div>
      </ConsoleSection>
      <ConsoleSection title="Privacy">
        <p className="text-muted-foreground">
          Managers see compliance status only. Sensitive originals remain
          restricted to Owner and People Operations.
        </p>
      </ConsoleSection>
    </>
  );
  return (
    <>
      <PageHeader
        title={staff.full_name}
        description="Employee profile, assignment, compliance and OMS account access."
        contentWidth="contained"
      />
      <WorkspaceGrid
        tabletCanvas="contained"
        rightRail={rail}
        documentMode
        tabletRailBreakpoint="lg"
      >
        {message.error || message.success ? (
          <div
            role="status"
            className={`rounded-[var(--sb-panel-radius)] border px-3 py-2 text-sm ${message.error ? "border-[var(--sb-danger)] bg-[var(--sb-danger-bg)] text-[var(--sb-danger)]" : "border-[var(--sb-success)] bg-[var(--sb-success-bg)] text-[var(--sb-success)]"}`}
          >
            {message.error ?? message.success}
          </div>
        ) : null}
        <nav
          className="flex min-h-11 gap-1 overflow-x-auto rounded-[var(--sb-panel-radius)] border bg-[var(--sb-surface-raised)] p-1 text-xs"
          aria-label="Employee profile sections"
        >
          {[
            ["overview", "Overview"],
            ["employment", "Employment & access"],
            ["compliance", "Documents"],
          ].map(([sectionId, label]) => (
            <Link
              key={sectionId}
              href={`/people/${id}?section=${sectionId}`}
              aria-current={activeSection === sectionId ? "page" : undefined}
              className={`inline-flex min-h-9 shrink-0 items-center rounded-[var(--sb-radius-control)] px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-green-700)] ${activeSection === sectionId ? "bg-[var(--sb-green-50)] font-semibold text-[var(--sb-green-900)]" : "hover:bg-[var(--sb-surface-muted)]"}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="space-y-3">
          {activeSection === "overview" ? (
            <>
              <ProfileSection id="overview" title="Overview">
                <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  <Fact
                    label="Staff code"
                    value={staff.staff_code?.toUpperCase()}
                  />
                  <Fact label="Email" value={staff.email?.toLowerCase()} />
                  <Fact label="Phone" value={staff.phone} />
                  <Fact label="Status" value={staff.status} capitalize />
                </dl>
              </ProfileSection>
              <div className="grid items-stretch gap-3 lg:grid-cols-2 [&>section]:h-full">
              {compTime.allowed ? (
                <ProfileSection id="time-off" title="Time-off balance" action={<div className="flex flex-wrap justify-end gap-2"><Button asChild size="sm" variant="outline"><Link href={`/attendance/review?branch=${staffSummary?.default_branch_id ?? "select"}&employee=${encodeURIComponent(staff.full_name)}`}>Open attendance</Link></Button>{permissions["comp_time.submit"] ? <CompTimeCorrectionForm staffId={staff.id} branchId={staffSummary?.default_branch_id??null}/> : null}</div>}>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Approved OT converted into leave minutes
                      </p>
                      <strong className="text-2xl tabular-nums">
                        {compTime.balance} min
                      </strong>
                    </div>
                  </div>
                  <div className="mt-3 divide-y border-t border-[var(--sb-border-soft)]">
                    {(compTime.ledger as Array<Record<string, unknown>>).map(
                      (row) => (
                        <div
                          key={String(row.id)}
                          className="grid grid-cols-[6rem_5rem_1fr_auto] gap-2 py-2 text-xs"
                        >
                          <span>{String(row.work_date)}</span>
                          <span className="capitalize">
                            {String(row.transaction_kind)}
                          </span>
                          <span className="truncate text-muted-foreground">
                            {String(row.reason)}
                          </span>
                          <strong className="tabular-nums">
                            {Number(row.minutes) > 0 ? "+" : ""}
                            {String(row.minutes)}m
                          </strong>
                        </div>
                      ),
                    )}
                    {!compTime.ledger.length ? (
                      <p className="py-3 text-xs text-muted-foreground">
                        No approved time-off balance yet.
                      </p>
                    ) : null}
                  </div>
                </ProfileSection>
              ) : null}
              {attendanceTracking.allowed ? (
                <ProfileSection id="attendance-follow-up" title="Attendance follow-up" action={<Button asChild size="sm" variant="outline"><Link href={`/attendance/review?branch=${staffSummary?.default_branch_id ?? "select"}&employee=${encodeURIComponent(staff.full_name)}`}>Review &amp; adjust</Link></Button>}>
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Missing and forgotten punches tracked since {attendanceTracking.startsOn}
                      </p>
                      <strong className="text-2xl tabular-nums">
                        {attendanceTracking.months[0]?.missingPunches ?? 0}
                      </strong>
                      <span className="ml-1 text-sm text-muted-foreground">this month</span>
                    </div>
                  </div>
                  <div className="mt-3 divide-y border-t border-[var(--sb-border-soft)]">
                    {attendanceTracking.months.map((row) => (
                      <div key={row.month} className="flex items-center justify-between py-2 text-xs">
                        <span>{row.month}</span>
                        <strong className="tabular-nums">{row.missingPunches} missing punches</strong>
                      </div>
                    ))}
                    {!attendanceTracking.months.length ? (
                      <p className="py-3 text-xs text-muted-foreground">
                        No missing punches since tracking began.
                      </p>
                    ) : null}
                  </div>
                </ProfileSection>
              ) : null}
              </div>
            </>
          ) : null}
          {activeSection === "employment" ? (
            <>
              <ProfileSection
                id="employment"
                title="Employment & outlet assignments"
                action={<Button asChild size="sm"><Link href={`/staffs/${staff.id}`}>Edit employment &amp; access</Link></Button>}
              >
                <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  <Fact
                    label="Employment type"
                    value={
                      staff.employment_type === "part_time"
                        ? "Part-time"
                        : "Full-time"
                    }
                  />
                  <Fact label="Role" value={staffSummary?.role_name} />
                  <Fact
                    label="Default outlet"
                    value={staffSummary?.default_branch_name}
                  />
                </dl>
              </ProfileSection>
              {permissions["people.sensitive.read"] ? (
                <ProfileSection
                  id="payroll-details"
                  title="Sensitive payroll details"
                  action={permissions["people.sensitive.manage"] ? <Button type="submit" form="protected-payroll-form" size="sm">Save protected details</Button> : null}
                >
                  <p className="mb-3 text-xs text-muted-foreground">
                    Restricted to People Operations and Owner. These fields are
                    used only in the protected weekly workbook.
                  </p>
                  {permissions["people.sensitive.manage"] ? (
                    <form
                      id="protected-payroll-form"
                      action={updateStaffSensitiveEmployment.bind(
                        null,
                        staff.id,
                      )}
                      className="grid gap-3 sm:grid-cols-2"
                    >
                      <FormField label="Passport number">
                        <input
                          name="passport_number"
                          defaultValue={sensitive?.passport_number ?? ""}
                          maxLength={100}
                          className={controlClass}
                        />
                      </FormField>
                      <FormField label="Basic salary (RM)">
                        <input
                          name="basic_salary"
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={sensitive?.basic_salary ?? ""}
                          className={controlClass}
                        />
                      </FormField>
                    </form>
                  ) : (
                    <dl className="grid gap-3 sm:grid-cols-2">
                      <Fact
                        label="Passport number"
                        value={sensitive?.passport_number}
                      />
                      <Fact
                        label="Basic salary"
                        value={
                          sensitive?.basic_salary == null
                            ? null
                            : `RM ${Number(sensitive.basic_salary).toFixed(2)}`
                        }
                      />
                    </dl>
                  )}
                </ProfileSection>
              ) : null}
            </>
          ) : null}
          {activeSection === "compliance" ? (
            <div className="grid items-stretch gap-3 lg:grid-cols-2 [&>section]:h-full">
              <ProfileSection id="compliance" title="Documents">
                <div className="divide-y">
                  {compliance.map((record) => (
                    <div
                      key={record.id}
                      className="grid min-h-14 gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
                    >
                      <span>
                        <strong className="block text-sm">
                          {record.type?.type_name ?? "Employee requirement"}
                        </strong>
                        <span className="text-xs text-muted-foreground">
                          {record.expires_on
                            ? `Expires ${record.expires_on}`
                            : "No expiry recorded"}
                        </span>
                      </span>
                      <Badge
                        variant={
                          record.state === "valid"
                            ? "success"
                            : record.state === "expired"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {record.state === "valid"
                          ? "Valid"
                          : record.state.replace("due_", "Expiring ")}
                      </Badge>
                      {record.attachment_id ? (
                        permissions["people.compliance.document.read"] ? (
                          <Button asChild size="sm" variant="outline">
                            <a
                              href={`/api/attachments/${record.attachment_id}`}
                            >
                              Open file
                            </a>
                          </Button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">
                            File restricted
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] text-muted-foreground">
                          Missing document
                        </span>
                      )}
                    </div>
                  ))}
                  {!compliance.length ? (
                    <EmptyState
                      title="No compliance records"
                      description="New records will appear here with their status, expiry date and supporting file."
                    />
                  ) : null}
                </div>
              </ProfileSection>
              {permissions["people.compliance.manage"] ? (
                <ProfileSection
                  id="add-compliance-record"
                  title="Add Record"
                  action={
                    <Button
                      type="submit"
                      form="staff-compliance-record-form"
                      size="sm"
                      disabled={!complianceTypes.length}
                    >
                      {"Save record & file"}
                    </Button>
                  }
                >
                  <ComplianceRecordForm
                    staffId={staff.id}
                    staffName={staff.full_name}
                    complianceTypes={complianceTypes}
                  />
                </ProfileSection>
              ) : null}
            </div>
          ) : null}
        </div>
      </WorkspaceGrid>
    </>
  );
}

function ProfileSection({
  id,
  title,
  action,
  children,
}: {
  id: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="min-w-0 scroll-mt-16 rounded-[var(--sb-panel-radius)] border border-[var(--sb-border-soft)] bg-[var(--sb-surface-raised)] p-4"
    >
      <div className="mb-3 flex min-h-9 flex-wrap items-start justify-between gap-3">
        <h2 className="pt-2 text-sm font-semibold">{title}</h2>
        {action ? <div className="min-w-0 max-w-full">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
function Fact({
  label,
  value,
  capitalize = false,
}: {
  label: string;
  value: string | null | undefined;
  capitalize?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={`mt-1 break-words text-sm ${value ? "font-medium" : "font-normal text-muted-foreground"} ${capitalize ? "capitalize" : ""}`}>
        {value || "—"}
      </dd>
    </div>
  );
}
const controlClass =
  "mt-1 h-[var(--sb-control-height)] w-full rounded-[var(--sb-panel-radius)] border bg-white px-3 text-sm";
function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="min-w-0 text-xs font-medium">
      {label}
      {children}
    </label>
  );
}
function ComplianceRecordForm({
  staffId,
  staffName,
  complianceTypes,
}: {
  staffId: string;
  staffName: string;
  complianceTypes: Array<{ id: string; type_name: string }>;
}) {
  return (
    <form
      id="staff-compliance-record-form"
      action={createComplianceRecord}
      className="grid gap-3 sm:grid-cols-2"
    >
      <input type="hidden" name="subject_kind" value="staff" />
      <input type="hidden" name="staff_id" value={staffId} />
      <input type="hidden" name="branch_id" value="" />
      <input type="hidden" name="responsible_staff_id" value="" />
      <input type="hidden" name="subject_label" value={staffName} />
      <input type="hidden" name="submit_for_review" value="1" />
      <FormField label="Record type">
        <SelectControl
          name="compliance_type_id"
          ariaLabel="Record type"
          required
          startEmpty
          placeholder="Choose requirement"
          className="mt-1"
          options={complianceTypes.map((type) => ({
            value: type.id,
            label: type.type_name,
          }))}
        />
      </FormField>
      <FormField label="Reference number">
        <input
          name="reference_no"
          className={controlClass}
          placeholder="Permit or certificate number"
        />
      </FormField>
      <FormField label="Issued on">
        <input name="issued_on" type="date" className={controlClass} />
      </FormField>
      <FormField label="Expires on">
        <input name="expires_on" type="date" className={controlClass} />
      </FormField>
      <label className="min-w-0 text-xs font-medium sm:col-span-2">
        Supporting file
        <span className="mt-0.5 block text-[10px] font-normal leading-4 text-muted-foreground">
          PDF, PNG, JPEG or WebP, up to 10 MB.
        </span>
        <input
          name="file"
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          required
          className="mt-2 block w-full text-xs file:mr-2 file:min-h-9 file:rounded-[var(--sb-radius-control)] file:border-0 file:bg-[var(--sb-green-100)] file:px-3 file:text-[var(--sb-green-900)]"
        />
      </label>
    </form>
  );
}
