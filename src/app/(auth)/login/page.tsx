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
  if (normalized === "disabled" || normalized.includes("disabled")) return "Your staff account is disabled. Please contact the Super Admin / Owner.";
  if (normalized.includes("otp_expired")) return "This link has expired or was already used. Please sign in with your password or contact the Super Admin / Owner.";
  if (normalized.includes("rate limit") || normalized.includes("too many") || normalized.includes("email")) return "Email sending is temporarily limited. Please contact the Super Admin / Owner for temporary password setup.";
  if (normalized.includes("invitation expired")) return "Your invitation link has expired. Please contact the Super Admin / Owner.";
  if (normalized.includes("invalid_or_expired_link") || normalized.includes("expired") || normalized.includes("invalid link")) return "This link has expired or was already used. Please sign in with your password or contact the Super Admin / Owner.";
  if (normalized.includes("invalid login") || normalized.includes("invalid credentials")) return "Invalid email or password.";
  return "We could not sign you in. Check your email and password, then try again.";
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
      <form action={signIn} className="space-y-4" aria-describedby="login-status">
        <Field label="Email" required>
          <Input name="email" type="email" inputMode="email" autoCapitalize="none" spellCheck={false} autoComplete="username" required autoFocus />
        </Field>
        <Field label="Password" required>
          <PasswordInput name="password" autoComplete="current-password" required />
        </Field>
        <div id="login-status" className="min-h-11" aria-live="polite">
          {params.message ? <p className="border border-[var(--sb-success)] bg-[var(--sb-success-bg)] p-3 text-sm text-[var(--sb-success)]">{params.message}</p> : null}
          {errorMessage ? <p className="border border-[var(--sb-danger)] bg-[var(--sb-danger-bg)] p-3 text-sm text-[var(--sb-danger)]" role="alert">{errorMessage}</p> : null}
        </div>
        <SubmitButton className="w-full" pendingLabel="Signing in…">Sign in</SubmitButton>
        <div className="text-center">
          <Link href="/forgot-password" className="inline-flex min-h-12 items-center text-sm font-medium text-[var(--sb-green-700)] underline-offset-4 hover:underline sm:text-xs">
            Forgot password?
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
