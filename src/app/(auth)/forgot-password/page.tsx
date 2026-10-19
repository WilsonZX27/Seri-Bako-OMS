import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Notice } from "@/components/ui/system-states";
import { sendPasswordReset } from "@/server/actions/auth";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell title="Reset password" description="Enter your staff email and we will send a reset link.">
      <form action={sendPasswordReset} className="space-y-4">
        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <p className="text-sm text-muted-foreground">No email on your account? Ask your administrator for a temporary password.</p>
        {params.success ? <Notice tone="success">{params.success}</Notice> : null}
        {params.error ? <Notice tone="error">{params.error}</Notice> : null}
        <SubmitButton className="w-full" pendingLabel="Sending reset link..." showOverlay overlayLabel="Sending reset link...">Send reset link</SubmitButton>
        <Link href="/login" className="block text-center text-sm text-muted-foreground hover:text-foreground">
          Back to login
        </Link>
      </form>
    </AuthShell>
  );
}
