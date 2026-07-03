import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { SetPasswordSuccess } from "@/components/auth/set-password-success";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { signOut } from "@/server/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { updatePassword } from "@/server/actions/auth";
import { getPasswordSetupContext } from "@/server/auth/staff-session";

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-";
}

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; invite?: string; previous_email?: string; invite_email?: string }>;
}) {
  const params = await searchParams;
  const inviteExpired = params.invite === "expired";

  if (inviteExpired) {
    return (
      <AuthShell title="Invitation link expired" description="This staff invitation link can no longer be used.">
        <div className="space-y-4">
          <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            Your invitation link has expired or has already been used. Please ask an Admin to resend your staff invitation from the Staff page.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild>
              <Link href="/login?message=Please contact your Admin to resend your invitation.">Request new invitation</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login">Back to login</Link>
            </Button>
          </div>
        </div>
      </AuthShell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (params.success) {
    return (
      <AuthShell title="Password updated" description="Your password has been changed.">
        <SetPasswordSuccess />
      </AuthShell>
    );
  }

  if (!user) {
    return (
      <AuthShell title="Link expired" description="This reset or invite session is no longer available.">
        <div className="space-y-4">
          <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            Your reset or invite link has expired or is invalid.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild>
              <Link href="/forgot-password">Request new reset link</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login">Back to login</Link>
            </Button>
          </div>
        </div>
      </AuthShell>
    );
  }

  const setupContext = await getPasswordSetupContext();
  if (!setupContext) {
    return (
      <AuthShell title="Link expired" description="This reset or invite session is no longer available.">
        <div className="space-y-4">
          <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            Your invitation link has expired or is invalid. Please request a new invitation.
          </p>
          <Button asChild className="w-full">
            <Link href="/login?message=Please contact your Admin to resend your invitation.">Request new invitation</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  const isInvitation = setupContext.staffStatus === "invited";
  const hasAccountMismatch = Boolean(params.previous_email && params.invite_email && params.previous_email.toLowerCase() !== params.invite_email.toLowerCase());

  return (
    <AuthShell title={isInvitation ? "Create your account" : "Set password"} description={isInvitation ? "Confirm your invitation details and create your own password." : "Create a new password to complete your reset."}>
      {hasAccountMismatch ? (
        <div className="mb-4 space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p>
            You are currently signed in as <span className="font-semibold">{params.previous_email}</span>, but this invitation belongs to <span className="font-semibold">{params.invite_email}</span>.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <form action={signOut}>
              <SubmitButton type="submit" variant="outline" className="w-full" pendingLabel="Signing out...">Sign out and continue</SubmitButton>
            </form>
            <Button asChild className="w-full">
              <Link href="/set-password">Continue with invitation</Link>
            </Button>
          </div>
        </div>
      ) : null}
      <div className="mb-5 rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
            {setupContext.companyLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={setupContext.companyLogoUrl} alt={`${setupContext.companyName} logo`} className="h-full w-full object-contain p-2" />
            ) : (
              "SB"
            )}
          </div>
          <div>
            <p className="text-sm font-semibold">{setupContext.companyName}</p>
            <p className="text-xs text-muted-foreground">Invitation and account setup</p>
          </div>
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Invitation sent by</dt>
            <dd className="mt-1">{setupContext.invitedByName ?? "Admin"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Role</dt>
            <dd className="mt-1">{setupContext.roleName ?? "Staff"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Branch</dt>
            <dd className="mt-1">{setupContext.branchName ?? "Assigned branch"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Invitation Expiry</dt>
            <dd className="mt-1">{setupContext.expiryLabel}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase text-muted-foreground">Invited At</dt>
            <dd className="mt-1">{formatDate(setupContext.invitedAt)}</dd>
          </div>
        </dl>
      </div>
      <form action={updatePassword} className="space-y-4">
        <input type="hidden" name="invited_user_id" value={setupContext.userId} />
        <input type="hidden" name="invited_email" value={setupContext.email} />
        <Field label="Email Address" required>
          <Input value={setupContext.email} readOnly />
        </Field>
        <Field label="Password" required>
          <PasswordInput name="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <Field label="Confirm Password" required>
          <PasswordInput name="confirm_password" autoComplete="new-password" minLength={8} required />
        </Field>
        <div className="rounded-md border bg-secondary/40 p-3 text-sm text-muted-foreground">
          Minimum 8 characters. Your new password should be different from the old one if you already used this account before.
        </div>
        <p className="text-sm text-muted-foreground">This password will be applied only to the invited account shown above.</p>
        {params.error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{params.error}</p> : null}
        <SubmitButton className="w-full" pendingLabel="Creating account..." showOverlay overlayLabel="Creating account...">{isInvitation ? "Create Account" : "Save password"}</SubmitButton>
        <Link href="/forgot-password" className="block text-center text-sm text-muted-foreground hover:text-foreground">
          Request new reset link
        </Link>
      </form>
    </AuthShell>
  );
}
