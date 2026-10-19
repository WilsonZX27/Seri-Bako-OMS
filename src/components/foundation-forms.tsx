import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RecordSection } from "@/components/record-workspace";
import { StaffAccessFields } from "@/components/staff-access-fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { previewDocumentNumber } from "@/server/queries/foundation";
import type { BranchType, RecordStatus, ResetFrequency, StaffAccessLevel, StaffStatus } from "@/types/database";

type Company = {
  id: string;
  company_code: string;
  company_name: string;
  registration_no: string | null;
  tax_no: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  logo_url?: string | null;
  logo_path?: string | null;
  status: RecordStatus;
};

type Branch = {
  id: string;
  company_id: string;
  branch_code: string;
  branch_name: string;
  branch_type: BranchType;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: RecordStatus;
};

type Staff = {
  username?: string | null;
  id: string;
  company_id: string;
  staff_code: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  default_branch_id: string | null;
  status: StaffStatus;
  invited_at?: string | null;
  invited_by?: string | null;
  accepted_at?: string | null;
  last_login_at?: string | null;
  invite_email?: string | null;
  employment_type?: "full_time" | "part_time";
  employment_end_date?: string | null;
};

type StaffAccess = {
  staffRole: { role_id: string; branch_id: string | null; effective_from: string; effective_to: string | null } | null;
  staffRoles?: Array<{ role_id: string; branch_id: string | null; effective_from: string; effective_to: string | null }>;
  staffBranch: { branch_id: string; access_level: StaffAccessLevel; is_default: boolean } | null;
  staffBranchIds: string[];
};

type Role = {
  id: string;
  company_id: string | null;
  role_code: string;
  role_name: string;
  description: string | null;
  status: RecordStatus;
};

type DocumentSequence = {
  id: string;
  company_id: string;
  document_type: string;
  prefix: string;
  next_number: number;
  padding: number;
  reset_frequency: ResetFrequency;
  status: RecordStatus;
};

type SelectCompany = { id: string; company_name: string };
type SelectRole = { id: string; role_name: string; role_code: string };

function StatusSelect({ value }: { value?: string }) {
  return (
    <SelectNative name="status" defaultValue={value ?? "active"}>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
      <option value="archived">Archived</option>
    </SelectNative>
  );
}

function CompanyHidden({ companies, companyId }: { companies: SelectCompany[]; companyId?: string | null }) {
  const id = companyId ?? companies[0]?.id ?? "";
  return <input type="hidden" name="company_id" value={id} />;
}

export function CompanyForm({ company, action, formId = "company-form", showSubmit = true }: { company: Company; action: (formData: FormData) => Promise<void>; formId?: string; showSubmit?: boolean }) {
  return (
    <form id={formId} action={action} className="space-y-4">
      <RecordSection title="Company Identity" description="Legal identity for the operating company.">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Company Code">
            <Input name="company_code" defaultValue={company.company_code} required />
          </Field>
          <Field label="Company Name">
            <Input name="company_name" defaultValue={company.company_name} required />
          </Field>
          <input type="hidden" name="status" value={company.status} />
        </div>
      </RecordSection>
      <RecordSection title="Registration & Contact" description="Registration and day-to-day company contact details.">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Registration No.">
            <Input name="registration_no" defaultValue={company.registration_no ?? ""} />
          </Field>
          <Field label="Tax No.">
            <Input name="tax_no" defaultValue={company.tax_no ?? ""} />
          </Field>
          <Field label="Phone">
            <Input name="phone" defaultValue={company.phone ?? ""} />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" defaultValue={company.email ?? ""} />
          </Field>
        </div>
      </RecordSection>
      <RecordSection title="Address">
        <Field label="Address">
          <Textarea name="address" defaultValue={company.address ?? ""} />
        </Field>
      </RecordSection>
      {showSubmit ? (
        <Card>
          <CardContent className="p-3">
            <div className="flex justify-end md:col-span-2">
              <SubmitButton type="submit" pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">Save company</SubmitButton>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </form>
  );
}

export function BranchForm({ branch, companies, action, formId, showSubmit = true }: { branch?: Branch; companies: SelectCompany[]; action: (formData: FormData) => Promise<void>; formId?: string; showSubmit?: boolean }) {
  return (
    <form id={formId} action={action} className="space-y-4">
      <CompanyHidden companies={companies} companyId={branch?.company_id} />
      <input type="hidden" name="status" value={branch?.status ?? "active"} />
      <RecordSection title="Identity" description="Branch reference, name, and operating type. Lifecycle changes stay in the action panel.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Branch Code">
            <Input name="branch_code" defaultValue={branch?.branch_code ?? ""} required />
          </Field>
          <Field label="Branch Name">
            <Input name="branch_name" defaultValue={branch?.branch_name ?? ""} required />
          </Field>
          <Field label="Branch Type">
            <SelectNative name="branch_type" defaultValue={branch?.branch_type ?? "outlet"}>
              <option value="central_kitchen">Central Kitchen</option>
              <option value="outlet">Outlet</option>
              <option value="event_booth">Event Booth</option>
              <option value="office">Office</option>
              <option value="other">Other</option>
            </SelectNative>
          </Field>
          <div className="md:col-span-2">            <p className="mt-1 text-xs text-muted-foreground">Select the outlet, kitchen, office, or event booth this record belongs to.</p>
            <p className="mt-1 text-xs text-muted-foreground">Stock movements for this branch are recorded to an internal default stock area automatically.</p>
</div>
        </div>
      </RecordSection>
      <RecordSection title="Contact & Address" description="Operational contact and branch / outlet address.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Phone">
            <Input name="phone" defaultValue={branch?.phone ?? ""} />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" defaultValue={branch?.email ?? ""} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Address">
              <Textarea name="address" defaultValue={branch?.address ?? ""} />
            </Field>
          </div>
        </div>
      </RecordSection>
      {showSubmit ? (
        <Card>
          <CardContent className="p-3">
          <div className="flex justify-end md:col-span-2">
            <SubmitButton type="submit" pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">{branch ? "Save branch" : "Create branch"}</SubmitButton>
          </div>
          </CardContent>
        </Card>
      ) : null}
    </form>
  );
}

export function StaffForm({
  staff,
  access,
  companies,
  branches,
  roles,
  action,
  formId,
  showSubmit = true,
  includeAuthSetup = false,
}: {
  staff?: Staff;
  access?: StaffAccess;
  companies: SelectCompany[];
  branches: Branch[];
  roles: SelectRole[];
  action: (formData: FormData) => Promise<void>;
  formId?: string;
  showSubmit?: boolean;
  includeAuthSetup?: boolean;
}) {
  const branchOptions = branches.filter((branch) => branch.status === "active");
  return (
    <form id={formId} action={action} className="grid gap-5 xl:grid-cols-2">
      <RecordSection title="Staff Profile">
          <CompanyHidden companies={companies} companyId={staff?.company_id} />
          <input type="hidden" name="status" value={staff?.status ?? "invited"} />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Staff Code" required>
            <Input name="staff_code" defaultValue={staff?.staff_code?.toUpperCase() ?? ""} required className="form-control-compact uppercase" />
          </Field>
          <Field label="Full Name" required>
            <Input name="full_name" defaultValue={staff?.full_name ?? ""} required className="form-control-compact" />
          </Field>
          <Field label="Username">
            <Input name="username" defaultValue={staff?.username ?? ""} autoCapitalize="none" autoComplete="off" minLength={3} maxLength={32} pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{2,31}" className="form-control-compact" />
          </Field>
          <Field label="Email (optional with username)">
            <Input name="email" type="email" defaultValue={staff?.email?.endsWith("@accounts.seribako.invalid") ? "" : staff?.email ?? staff?.invite_email ?? ""} className="form-control-compact" />
          </Field>
          <Field label="Phone">
            <Input name="phone" defaultValue={staff?.phone ?? ""} className="form-control-compact" />
          </Field>
          <Field label="Employment Type" required>
            <SelectNative name="employment_type" defaultValue={staff?.employment_type ?? "full_time"} className="form-control-compact">
              <option value="full_time">Full-time</option>
              <option value="part_time">Part-time</option>
            </SelectNative>
          </Field>
          <Field label="Last Working Date">
            <Input name="employment_end_date" type="date" defaultValue={staff?.employment_end_date ?? ""} className="form-control-compact" />
            <p className="mt-1 text-xs text-muted-foreground">The account stops working after this date. Historical schedules and payroll stay intact.</p>
          </Field>
        </div>
      </RecordSection>

      <RecordSection title="Access">
        <StaffAccessFields
          branches={branchOptions}
          roles={roles}
          access={{
            roleId: access?.staffRole?.role_id,
            defaultBranchId: access?.staffBranch?.branch_id,
            branchIds: access?.staffBranchIds,
          }}
        />
      </RecordSection>

      {includeAuthSetup ? <StaffAuthSetupFields /> : null}

      {showSubmit ? (
        <Card className="xl:col-span-2">
          <CardContent className="flex justify-end p-5">
            <SubmitButton type="submit" pendingLabel={staff ? "Saving..." : "Creating account..."} showOverlay overlayLabel={staff ? "Saving changes..." : "Creating staff account..."}>{staff ? "Save staff" : "Create staff"}</SubmitButton>
          </CardContent>
        </Card>
      ) : null}
    </form>
  );
}

export function StaffAuthSetupFields({ formId }: { formId?: string }) {
  return (
    <>
      <input type="hidden" name="auth_setup_method" value="temporary_password" form={formId} />
      <input type="hidden" name="temporary_password" value="" form={formId} />
    </>
  );
}

export function DocumentSequenceForm({
  sequence,
  companies,
  action,
}: {
  sequence?: DocumentSequence;
  companies: SelectCompany[];
  action: (formData: FormData) => Promise<void>;
}) {
  const nextNumber = sequence?.next_number ?? 1;
  const padding = sequence?.padding ?? 5;
  const prefix = sequence?.prefix ?? "DOC";
  return (
    <Card>
      <CardContent className="p-5">
        <form action={action} className="grid gap-4 md:grid-cols-2">
          <CompanyHidden companies={companies} companyId={sequence?.company_id} />
          <Field label="Document Type">
            <Input name="document_type" defaultValue={sequence?.document_type ?? ""} placeholder="purchase_order" required />
          </Field>
          <Field label="Prefix">
            <Input name="prefix" defaultValue={prefix} required />
          </Field>
          <Field label="Padding">
            <Input name="padding" type="number" min="1" max="12" defaultValue={padding} required />
          </Field>
          <Field label="Current Number">
            <Input name="next_number" type="number" min="1" defaultValue={nextNumber} required />
          </Field>
          <Field label="Reset Rule">
            <SelectNative name="reset_frequency" defaultValue={sequence?.reset_frequency ?? "yearly"}>
              <option value="never">Never</option>
              <option value="yearly">Yearly</option>
              <option value="monthly">Monthly</option>
              <option value="daily">Daily</option>
            </SelectNative>
          </Field>
          <Field label="Status">
            <StatusSelect value={sequence?.status} />
          </Field>
          <div className="md:col-span-2">
            <div data-inset-surface className="rounded-[var(--sb-panel-radius)] border bg-secondary p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">Preview Number</p>
              <p className="mt-1 font-mono text-lg font-semibold">{previewDocumentNumber(prefix, nextNumber, padding)}</p>
            </div>
          </div>
          <div className="flex justify-end md:col-span-2">
            <SubmitButton type="submit" pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">{sequence ? "Save sequence" : "Create sequence"}</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function RoleForm({ role, companies, action, formId, showSubmit = true }: { role?: Role; companies: SelectCompany[]; action: (formData: FormData) => Promise<void>; formId?: string; showSubmit?: boolean }) {
  return (
    <form id={formId} action={action} className="space-y-4">
      <RecordSection title="Role Identity" description="Role name, stable code, and purpose.">
        <div className="grid gap-4 md:grid-cols-2">
          <CompanyHidden companies={companies} companyId={role?.company_id} />
          <Field label="Role Code">
            <Input name="role_code" defaultValue={role?.role_code ?? ""} required />
          </Field>
          <Field label="Role Name">
            <Input name="role_name" defaultValue={role?.role_name ?? ""} required />
          </Field>
          <input type="hidden" name="status" value={role?.status ?? "active"} />
          <div className="md:col-span-2">
            <Field label="Description">
              <Textarea name="description" defaultValue={role?.description ?? ""} />
            </Field>
          </div>
        </div>
      </RecordSection>
      {showSubmit ? (
        <Card>
          <CardContent className="p-3">
          <div className="flex justify-end md:col-span-2">
            <SubmitButton type="submit" pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">{role ? "Save role" : "Create role"}</SubmitButton>
          </div>
          </CardContent>
        </Card>
      ) : null}
    </form>
  );
}
