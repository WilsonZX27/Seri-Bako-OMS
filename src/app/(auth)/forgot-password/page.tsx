import Link from "next/link";
import { sendPasswordReset } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Forgot Password</CardTitle>
          <CardDescription>Enter your staff email and we will send a password reset link.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={sendPasswordReset} className="space-y-4">
            <Field label="Email">
              <Input name="email" type="email" autoComplete="email" required />
            </Field>
            {params.error ? <p className="text-sm text-destructive">{params.error}</p> : null}
            <Button className="w-full">Send reset link</Button>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/login">Back to login</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
