import { redirect } from "next/navigation";
import { ChangePasswordSuccess } from "@/components/auth/change-password-success";
import { AuthShell } from "@/components/auth/auth-shell";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { createClient } from "@/lib/supabase/server";
import { changePassword, signOut } from "@/server/actions/auth";

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=Please sign in before changing your password.");
  }

  const { data: staff, error: staffError } = await supabase
    .from("staffs")
    .select("must_change_password, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (params.success) {
    return (
      <AuthShell title="Password updated" description="Your staff account is ready.">
        <ChangePasswordSuccess />
      </AuthShell>
    );
  }

  if (staffError || !staff) {
    return (
      <AuthShell title="Account check unavailable" description="We could not verify your staff profile, so no account changes were made.">
        <p className="border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Sign out and try again. If this continues, ask the Super Admin / Owner to check that your login is linked to an active staff profile.
        </p>
        <form action={signOut} className="mt-3">
          <SubmitButton type="submit" variant="outline" className="w-full" pendingLabel="Signing out...">Sign out safely</SubmitButton>
        </form>
      </AuthShell>
    );
  }

  if (!staff.must_change_password) {
    redirect("/dashboard");
  }

  return (
    <AuthShell title="Change your password" description="Your temporary password must be changed before using Seri Bako OMS.">
      <form action={changePassword} className="space-y-4">
        <Field label="New Password" required>
          <PasswordInput name="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <Field label="Confirm New Password" required>
          <PasswordInput name="confirm_password" autoComplete="new-password" minLength={8} required />
        </Field>
        <div className="border bg-secondary/40 p-3 text-sm text-muted-foreground">
          Use at least 8 characters. After saving, you will continue to the dashboard.
        </div>
        {params.error ? <p className="border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{params.error}</p> : null}
        <SubmitButton className="w-full" pendingLabel="Changing password..." showOverlay overlayLabel="Changing password...">Change password</SubmitButton>
      </form>
      <form action={signOut} className="mt-3">
        <SubmitButton type="submit" variant="outline" className="w-full" pendingLabel="Signing out...">Sign out</SubmitButton>
      </form>
    </AuthShell>
  );
}
