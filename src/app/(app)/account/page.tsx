import { KeyRound, Upload, UserRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
  const role = account?.role_code ?? account?.role ?? "viewer";
  const initials = (account?.full_name ?? account?.email ?? "User").slice(0, 2).toUpperCase();

  return (
    <>
      <PageHeader title="My Profile" description="Manage your account details, profile picture, and password." />
      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Card id="password">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-lg font-semibold text-primary">
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
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <UserRound className="h-4 w-4 text-primary" />
                <h2 className="font-semibold">Profile details</h2>
              </div>
              <form action={updateOwnProfile} className="grid gap-4">
                <label className="grid gap-2 text-sm font-medium">
                  Display name <span className="sr-only">required</span>
                  <Input name="full_name" defaultValue={account?.full_name ?? ""} required />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Phone
                  <Input name="phone" defaultValue={account?.phone ?? ""} />
                </label>
                <div className="flex justify-end">
                  <SubmitButton pendingLabel="Saving...">Save profile</SubmitButton>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                <h2 className="font-semibold">Change password</h2>
              </div>
              <form action={changeOwnPassword} className="grid gap-4">
                <Input name="current_password" type="password" placeholder="Current password" required />
                <Input name="new_password" type="password" placeholder="New password" minLength={8} required />
                <Input name="confirm_password" type="password" placeholder="Confirm new password" minLength={8} required />
                <div className="flex justify-end">
                  <SubmitButton pendingLabel="Changing...">Change password</SubmitButton>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card>
            <CardContent className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                <h2 className="font-semibold">Profile picture</h2>
              </div>
              <form action={uploadOwnAvatar} className="space-y-3">
                <Input name="avatar" type="file" accept="image/png,image/jpeg,image/webp" required />
                <p className="text-xs text-muted-foreground">PNG, JPG, or WebP. Maximum 2MB.</p>
                <SubmitButton className="w-full" pendingLabel="Uploading...">Upload picture</SubmitButton>
              </form>
              {account?.avatar_url ? (
                <form action={removeOwnAvatar} className="mt-3">
                  <SubmitButton variant="outline" className="w-full" pendingLabel="Removing...">Remove picture</SubmitButton>
                </form>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">
              Role and branch access are managed by an administrator from the Staff page.
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
