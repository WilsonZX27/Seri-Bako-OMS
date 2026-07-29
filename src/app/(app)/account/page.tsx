import { KeyRound, UserRound } from "lucide-react";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { getRoleDisplayLabel } from "@/lib/roles";
import { changeOwnPassword, removeOwnAvatar, updateOwnProfile, uploadOwnAvatar } from "@/server/actions/account";
import { getCurrentProfile } from "@/server/queries/common";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const profile = await getCurrentProfile();
  const account = profile as {
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
    role_code?: string | null;
    role?: string | null;
    avatar_url?: string | null;
  } | null;
  const role = account?.role_code ?? account?.role ?? null;
  const initials = (account?.full_name ?? account?.email ?? "User").slice(0, 2).toUpperCase();
  const accountContext = <>
    <ConsoleSection title="Profile actions">
      <SubmitButton form="account-profile-form" className="w-full" pendingLabel="Saving..." data-mobile-primary-action>Save profile</SubmitButton>
    </ConsoleSection>
    <ConsoleSection title="Profile picture">
      <form action={uploadOwnAvatar} className="space-y-3">
        <Input name="avatar" type="file" accept="image/png,image/jpeg,image/webp" required />
        <p className="text-xs text-muted-foreground">PNG, JPG, or WebP. Maximum 2MB.</p>
        <SubmitButton className="w-full" pendingLabel="Uploading...">Upload picture</SubmitButton>
      </form>
      {account?.avatar_url ? <form action={removeOwnAvatar} className="pt-1"><SubmitButton variant="outline" className="w-full" pendingLabel="Removing...">Remove picture</SubmitButton></form> : null}
    </ConsoleSection>
    <ConsoleSection title="Access">
      <p className="text-xs leading-5 text-muted-foreground">Role and branch access are managed by an authorized administrator from Users &amp; Staff.</p>
    </ConsoleSection>
  </>;

  return (
    <>
      <PageHeader title="My Profile" description="Manage your account details, profile picture, and password." />
      <WorkspaceGrid documentMode tabletRailMode="split" tabletCanvas="contained" rightRail={accountContext}>
        <section data-account-identity className="border border-[var(--sb-border-soft)] bg-white px-4 py-4">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {account?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={account.avatar_url} alt="Profile picture" className="h-full w-full object-cover" />
              ) : initials}
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold">{account?.full_name ?? "Signed in user"}</p>
              <p className="text-sm text-muted-foreground">{account?.email}</p>
              <p className="mt-2 inline-flex rounded-full border bg-secondary px-2.5 py-1 text-xs font-medium">{getRoleDisplayLabel(role)}</p>
            </div>
          </div>
        </section>

        <section className="border border-[var(--sb-border-soft)] bg-white p-4">
          <div className="mb-4 flex items-center gap-2"><UserRound className="h-4 w-4 text-primary" /><h2 className="font-semibold">Profile details</h2></div>
          <form id="account-profile-form" action={updateOwnProfile} className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium">Display name <span className="sr-only">required</span><Input name="full_name" defaultValue={account?.full_name ?? ""} required className="form-control-compact" /></label>
            <label className="grid gap-2 text-sm font-medium">Phone<Input name="phone" defaultValue={account?.phone ?? ""} className="form-control-compact" /></label>
          </form>
        </section>

        <section id="password" className="border border-[var(--sb-border-soft)] bg-white p-4">
          <div className="mb-4 flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /><h2 className="font-semibold">Change password</h2></div>
          <form action={changeOwnPassword} className="grid gap-4">
            <Input name="current_password" type="password" placeholder="Current password" required className="form-control-compact" />
            <Input name="new_password" type="password" placeholder="New password" minLength={8} required className="form-control-compact" />
            <Input name="confirm_password" type="password" placeholder="Confirm new password" minLength={8} required className="form-control-compact" />
            <div className="flex justify-end"><SubmitButton pendingLabel="Changing...">Change password</SubmitButton></div>
          </form>
        </section>
      </WorkspaceGrid>
    </>
  );
}
