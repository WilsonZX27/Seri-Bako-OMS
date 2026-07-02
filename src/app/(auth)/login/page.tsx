import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { signIn } from "@/server/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

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
        {params.error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{params.error}</p> : null}
        <SubmitButton className="w-full" pendingLabel="Signing in..." showOverlay overlayLabel="Loading data...">Sign in</SubmitButton>
        <Link href="/forgot-password" className="block text-center text-sm text-muted-foreground hover:text-foreground">
          Forgot password?
        </Link>
      </form>
    </AuthShell>
  );
}
