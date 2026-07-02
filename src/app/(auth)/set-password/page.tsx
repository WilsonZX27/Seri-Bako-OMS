import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { SetPasswordSuccess } from "@/components/auth/set-password-success";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { createClient } from "@/lib/supabase/server";
import { updatePassword } from "@/server/actions/auth";

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; invite?: string }>;
}) {
  const params = await searchParams;
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
    const inviteExpired = params.invite === "expired";
    return (
      <AuthShell title={inviteExpired ? "Invitation link expired" : "Link expired"} description={inviteExpired ? "This staff invitation link can no longer be used." : "This reset or invite session is no longer available."}>
        <div className="space-y-4">
          <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {inviteExpired ? "Your invitation link has expired or has already been used. Please ask an Admin to resend your staff invitation from the Staff page." : "Your reset or invite link has expired or is invalid."}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild>
              <Link href={inviteExpired ? "/login?message=Please contact your Admin to resend your invitation." : "/forgot-password"}>
                {inviteExpired ? "Request new invite" : "Request new reset link"}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login">Back to login</Link>
            </Button>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set password" description="Create a new password to finish setup or complete a reset.">
      <form action={updatePassword} className="space-y-4">
        <Field label="New Password">
          <PasswordInput name="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <Field label="Confirm Password">
          <PasswordInput name="confirm_password" autoComplete="new-password" minLength={8} required />
        </Field>
        <div className="rounded-md border bg-secondary/40 p-3 text-sm text-muted-foreground">
          Minimum 8 characters. Your new password should be different from the old one if you already used this account before.
        </div>
        <p className="text-sm text-muted-foreground">After changing your password, return to login and sign in again.</p>
        {params.error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{params.error}</p> : null}
        <SubmitButton className="w-full" pendingLabel="Updating password..." showOverlay overlayLabel="Updating password...">Save password</SubmitButton>
        <Link href="/forgot-password" className="block text-center text-sm text-muted-foreground hover:text-foreground">
          Request new reset link
        </Link>
      </form>
    </AuthShell>
  );
}
