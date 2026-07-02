import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
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
        <p className="text-sm text-muted-foreground">After changing your password, return to login and sign in again.</p>
        {params.success ? <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{params.success}</p> : null}
        {params.error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{params.error}</p> : null}
        <SubmitButton className="w-full" pendingLabel="Sending reset link..." showOverlay overlayLabel="Sending reset link...">Send reset link</SubmitButton>
        <Link href="/login" className="block text-center text-sm text-muted-foreground hover:text-foreground">
          Back to login
        </Link>
      </form>
    </AuthShell>
  );
}
