import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { previewDocumentNumber } from "@/server/queries/foundation";
import type { BranchType, LocationType, RecordStatus, ResetFrequency, StaffAccessLevel, StaffStatus } from "@/types/database";

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

type Location = {
  id: string;
  company_id: string | null;
  branch_id: string | null;
  location_code: string;
  location_name: string;
  location_type: LocationType;
  status: string;
};

type Staff = {
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
};

type StaffAccess = {
  staffRole: { role_id: string; branch_id: string | null; effective_from: string; effective_to: string | null } | null;
  staffBranch: { branch_id: string; access_level: StaffAccessLevel; is_default: boolean } | null;
  staffLocationIds: string[];
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
type SelectBranch = { id: string; branch_name: string };
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

function StaffStatusSelect({ value }: { value?: string }) {
  return (
    <SelectNative name="status" defaultValue={value ?? "invited"}>
      <option value="invited">Invited</option>
      <option value="active">Active</option>
      <option value="disabled">Disabled</option>
    </SelectNative>
  );
}

function CompanyHidden({ companies, companyId }: { companies: SelectCompany[]; companyId?: string | null }) {
  const id = companyId ?? companies[0]?.id ?? "";
  return <input type="hidden" name="company_id" value={id} />;
}

export function CompanyForm({ company, action }: { company: Company; action: (formData: FormData) => Promise<void> }) {
  return (
    <Card>
      <CardContent className="p-5">
        <form action={action} className="grid gap-4 md:grid-cols-2">
          <Field label="Company Code">
            <Input name="company_code" defaultValue={company.company_code} required />
          </Field>
          <Field label="Company Name">
            <Input name="company_name" defaultValue={company.company_name} required />
          </Field>
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
          <Field label="Status">
            <StatusSelect value={company.status} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Address">
              <Textarea name="address" defaultValue={company.address ?? ""} />
            </Field>
          </div>
          <div className="flex justify-end md:col-span-2">
            <SubmitButton type="submit" pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">Save company</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function BranchForm({ branch, companies, action }: { branch?: Branch; companies: SelectCompany[]; action: (formData: FormData) => Promise<void> }) {
  return (
    <Card>
      <CardContent className="p-5">
        <form action={action} className="grid gap-4 md:grid-cols-2">
          <CompanyHidden companies={companies} companyId={branch?.company_id} />
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
            <p className="mt-1 text-xs text-muted-foreground">Select the outlet, kitchen, office, or event booth this record belongs to.</p>
            <p className="mt-1 text-xs text-muted-foreground">Stock movements for this branch are recorded to an internal default stock area automatically.</p>
          </Field>
          <Field label="Phone">
            <Input name="phone" defaultValue={branch?.phone ?? ""} />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" defaultValue={branch?.email ?? ""} />
          </Field>
          <Field label="Status">
            <StatusSelect value={branch?.status} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Address">
              <Textarea name="address" defaultValue={branch?.address ?? ""} />
            </Field>
          </div>
          <div className="flex justify-end md:col-span-2">
            <SubmitButton type="submit" pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">{branch ? "Save branch" : "Create branch"}</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function LocationForm({ location, companies, branches, action }: { location?: Location; companies: SelectCompany[]; branches: SelectBranch[]; action: (formData: FormData) => Promise<void> }) {
  return (
    <Card>
      <CardContent className="p-5">
        <form action={action} className="grid gap-4 md:grid-cols-2">
          <CompanyHidden companies={companies} companyId={location?.company_id} />
          <Field label="Location Code">
            <Input name="location_code" defaultValue={location?.location_code ?? ""} required />
          </Field>
          <Field label="Location Name">
            <Input name="location_name" defaultValue={location?.location_name ?? ""} required />
          </Field>
          <Field label="Branch">
            <SelectNative name="branch_id" defaultValue={location?.branch_id ?? branches[0]?.id ?? ""} required>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.branch_name}
                </option>
              ))}
            </SelectNative>
            <p className="mt-1 text-xs text-muted-foreground">Locations are internal stock areas. Daily operations use Branch only, while locations remain for ledger accuracy and future expansion.</p>
          </Field>
          <Field label="Location Type">
            <SelectNative name="location_type" defaultValue={location?.location_type ?? "dry_store"}>
              <option value="dry_store">Dry Store</option>
              <option value="chiller">Chiller</option>
              <option value="freezer">Freezer</option>
              <option value="packaging_area">Packaging Area</option>
              <option value="production_floor">Production Floor</option>
              <option value="dispatch_area">Dispatch Area</option>
              <option value="receiving_area">Receiving Area</option>
              <option value="finished_goods_store">Finished Goods Store</option>
              <option value="other">Other</option>
            </SelectNative>
          </Field>
          <Field label="Status">
            <StatusSelect value={location?.status} />
          </Field>
          <div className="flex justify-end md:col-span-2">
            <SubmitButton type="submit" pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">{location ? "Save location" : "Create location"}</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function StaffForm({
  staff,
  access,
  companies,
  branches,
  roles,
  action,
}: {
  staff?: Staff;
  access?: StaffAccess;
  companies: SelectCompany[];
  branches: SelectBranch[];
  roles: SelectRole[];
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <form action={action} className="grid gap-4 md:grid-cols-2">
          <CompanyHidden companies={companies} companyId={staff?.company_id} />
          <Field label="Staff Code">
            <Input name="staff_code" defaultValue={staff?.staff_code ?? ""} />
          </Field>
          <Field label="Full Name">
            <Input name="full_name" defaultValue={staff?.full_name ?? ""} required />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" defaultValue={staff?.email ?? staff?.invite_email ?? ""} required />
          </Field>
          <Field label="Phone">
            <Input name="phone" defaultValue={staff?.phone ?? ""} />
          </Field>
          <Field label="Primary Role">
            <SelectNative name="role_id" defaultValue={access?.staffRole?.role_id ?? roles[0]?.id ?? ""} required>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.role_name}
                </option>
              ))}
            </SelectNative>
          </Field>
          <Field label="Role Branch Scope">
            <SelectNative name="role_branch_id" defaultValue={access?.staffRole?.branch_id ?? ""}>
              <option value="">Company-wide</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.branch_name}
                </option>
              ))}
            </SelectNative>
          </Field>
          <Field label="Effective From">
            <Input name="effective_from" type="date" defaultValue={access?.staffRole?.effective_from ?? new Date().toISOString().slice(0, 10)} required />
          </Field>
          <Field label="Effective To">
            <Input name="effective_to" type="date" defaultValue={access?.staffRole?.effective_to ?? ""} />
          </Field>
          <Field label="Default Branch Access">
            <SelectNative name="branch_id" defaultValue={access?.staffBranch?.branch_id ?? branches[0]?.id ?? ""} required>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.branch_name}
                </option>
              ))}
            </SelectNative>
            <p className="mt-1 text-xs text-muted-foreground">Select the outlet, kitchen, office, or event booth this record belongs to.</p>
          </Field>
          <Field label="Branch Access Level">
            <SelectNative name="access_level" defaultValue={access?.staffBranch?.access_level ?? "read_only"}>
              <option value="full">Full</option>
              <option value="manage">Manage</option>
              <option value="read_only">Read Only</option>
            </SelectNative>
          </Field>
          <Field label="Status">
            <StaffStatusSelect value={staff?.status} />
          </Field>
          {!staff ? (
            <div className="space-y-3 rounded-lg border bg-secondary/30 p-4 md:col-span-2">
              <div>
                <p className="text-sm font-semibold">Auth setup</p>
                <p className="mt-1 text-xs text-muted-foreground">Temporary password is recommended for internal staff because email invite links can expire or hit rate limits.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="rounded-md border bg-white p-3 text-sm">
                  <input className="mr-2" type="radio" name="auth_setup_method" value="temporary_password" defaultChecked />
                  Create login with temporary password
                  <span className="mt-1 block text-xs text-muted-foreground">Password is shown once after creation. Staff must change it at first login.</span>
                </label>
                <label className="rounded-md border bg-white p-3 text-sm">
                  <input className="mr-2" type="radio" name="auth_setup_method" value="email_invitation" />
                  Send email invitation
                  <span className="mt-1 block text-xs text-muted-foreground">Optional. Depends on Supabase email rate limits and link expiry.</span>
                </label>
              </div>
              <Field label="Temporary Password">
                <Input name="temporary_password" type="text" placeholder="Leave blank to auto-generate" autoComplete="off" />
                <p className="mt-1 text-xs text-muted-foreground">Do not reuse passwords. Share temporary passwords securely and ask staff to change immediately.</p>
              </Field>
            </div>
          ) : null}
          <div className="flex justify-end md:col-span-2">
            <SubmitButton type="submit" pendingLabel={staff ? "Saving..." : "Creating account..."} showOverlay overlayLabel={staff ? "Saving changes..." : "Creating staff account..."}>{staff ? "Save staff" : "Create staff"}</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
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
            <div className="rounded-lg border bg-secondary p-4">
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

export function RoleForm({ role, companies, action }: { role?: Role; companies: SelectCompany[]; action: (formData: FormData) => Promise<void> }) {
  return (
    <Card>
      <CardContent className="p-5">
        <form action={action} className="grid gap-4 md:grid-cols-2">
          <CompanyHidden companies={companies} companyId={role?.company_id} />
          <Field label="Role Code">
            <Input name="role_code" defaultValue={role?.role_code ?? ""} required />
          </Field>
          <Field label="Role Name">
            <Input name="role_name" defaultValue={role?.role_name ?? ""} required />
          </Field>
          <Field label="Status">
            <StatusSelect value={role?.status} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Description">
              <Textarea name="description" defaultValue={role?.description ?? ""} />
            </Field>
          </div>
          <div className="flex justify-end md:col-span-2">
            <SubmitButton type="submit" pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">{role ? "Save role" : "Create role"}</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
