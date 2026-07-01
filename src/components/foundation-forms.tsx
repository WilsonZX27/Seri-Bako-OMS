import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { previewDocumentNumber } from "@/server/queries/foundation";
import type { BranchType, LocationType, RecordStatus, ResetFrequency, StaffAccessLevel } from "@/types/database";

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
  status: RecordStatus;
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
type SelectLocation = { id: string; location_name: string; location_code: string };
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
            <Button type="submit">Save company</Button>
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
            <Button type="submit">{branch ? "Save branch" : "Create branch"}</Button>
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
            <Button type="submit">{location ? "Save location" : "Create location"}</Button>
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
  locations,
  action,
}: {
  staff?: Staff;
  access?: StaffAccess;
  companies: SelectCompany[];
  branches: SelectBranch[];
  roles: SelectRole[];
  locations: SelectLocation[];
  action: (formData: FormData) => Promise<void>;
}) {
  const selectedLocationIds = new Set(access?.staffLocationIds ?? []);
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
            <Input name="email" type="email" defaultValue={staff?.email ?? ""} />
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
          </Field>
          <Field label="Branch Access Level">
            <SelectNative name="access_level" defaultValue={access?.staffBranch?.access_level ?? "read_only"}>
              <option value="full">Full</option>
              <option value="manage">Manage</option>
              <option value="read_only">Read Only</option>
            </SelectNative>
          </Field>
          <Field label="Status">
            <StatusSelect value={staff?.status} />
          </Field>
          <div className="md:col-span-2">
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm font-medium">Location Access</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {locations.map((location) => (
                  <label key={location.id} className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm">
                    <input name="location_ids" type="checkbox" value={location.id} defaultChecked={selectedLocationIds.has(location.id)} className="h-4 w-4" />
                    <span>{location.location_name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end md:col-span-2">
            <Button type="submit">{staff ? "Save staff" : "Create staff"}</Button>
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
            <Button type="submit">{sequence ? "Save sequence" : "Create sequence"}</Button>
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
            <Button type="submit">{role ? "Save role" : "Create role"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
