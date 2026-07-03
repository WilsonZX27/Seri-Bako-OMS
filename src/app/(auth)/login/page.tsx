import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { signIn } from "@/server/actions/auth";

function friendlyLoginError(error?: string) {
  if (!error) return null;
  const normalized = error.toLowerCase();
  if (normalized === "disabled" || normalized.includes("disabled")) return "Your staff account is disabled. Please contact Admin.";
  if (normalized.includes("otp_expired")) return "This link has expired or was already used. Please sign in with your password or contact Admin.";
  if (normalized.includes("rate limit") || normalized.includes("too many") || normalized.includes("email")) return "Email sending is temporarily limited. Please contact Admin for temporary password setup.";
  if (normalized.includes("invitation expired")) return "Your invitation link has expired. Please contact Admin.";
  if (normalized.includes("invalid_or_expired_link") || normalized.includes("expired") || normalized.includes("invalid link")) return "This link has expired or was already used. Please sign in with your password or contact Admin.";
  if (normalized.includes("invalid login") || normalized.includes("invalid credentials")) return "Invalid email or password.";
  return error;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = friendlyLoginError(params.error);

  return (
    <AuthShell title="Welcome back" description="Sign in with your staff account to continue.">
      <form action={signIn} className="space-y-4">
        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password">
          <PasswordInput name="password" autoComplete="current-password" required />
        </Field>
        {params.message ? <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{params.message}</p> : null}
        {errorMessage ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{errorMessage}</p> : null}
        <SubmitButton className="w-full" pendingLabel="Signing in..." showOverlay overlayLabel="Loading data...">Sign in</SubmitButton>
        <Link href="/forgot-password" className="block text-center text-sm text-muted-foreground hover:text-foreground">
          Forgot password?
        </Link>
      </form>
    </AuthShell>
  );
}
