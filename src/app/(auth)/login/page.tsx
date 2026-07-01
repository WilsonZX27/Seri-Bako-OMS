import Link from "next/link";
import { signIn } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Seri Bako Operations</CardTitle>
          <CardDescription>Sign in to manage master data and inventory movements.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signIn} className="space-y-4">
            <Field label="Email">
              <Input name="email" type="email" autoComplete="email" required />
            </Field>
            <Field label="Password">
              <Input name="password" type="password" autoComplete="current-password" required />
            </Field>
            {params.message ? <p className="text-sm text-muted-foreground">{params.message}</p> : null}
            {params.error ? <p className="text-sm text-destructive">{params.error}</p> : null}
            <Button className="w-full">Sign in</Button>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/forgot-password">Forgot password?</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
