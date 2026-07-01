import { updatePassword } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Set Password</CardTitle>
          <CardDescription>Create your password to finish account setup.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updatePassword} className="space-y-4">
            <Field label="New Password">
              <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
            </Field>
            <Field label="Confirm Password">
              <Input name="confirm_password" type="password" autoComplete="new-password" minLength={8} required />
            </Field>
            {params.error ? <p className="text-sm text-destructive">{params.error}</p> : null}
            <Button className="w-full">Save password</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
