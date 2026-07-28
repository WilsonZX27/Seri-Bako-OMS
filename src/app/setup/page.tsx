import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, TriangleAlert } from "lucide-react";
import { runFirstAdminSetup } from "@/server/actions/setup";
import { getSetupStatus } from "@/server/queries/setup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; completed?: string }>;
}) {
  const [params, status] = await Promise.all([searchParams, getSetupStatus()]);

  if (!status.user) {
    redirect("/login");
  }

  if (status.hasAdmin || params.completed) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Setup already completed.</CardTitle>
            <CardDescription>A Super Admin / Owner already exists for this workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <CardTitle>First Owner Setup</CardTitle>
          <CardDescription>
            Create the workspace foundation and assign the current signed-in user as Super Admin / Owner.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-secondary/40 p-4 text-sm text-muted-foreground">
            This confirms the company, Central Kitchen branch, protected owner role,
            your staff profile, and default document sequences. Only the deployment
            owner may provide the one-time bootstrap token; ordinary authenticated
            users cannot claim Owner access.
          </div>
          {params.error ? (
            <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{params.error}</p>
            </div>
          ) : null}
          <form action={runFirstAdminSetup} className="space-y-3">
            <label className="grid gap-1 text-sm font-medium" htmlFor="bootstrap-token">
              Operator bootstrap token
              <input id="bootstrap-token" name="bootstrap_token" type="password" autoComplete="off" required className="h-10 rounded-md border bg-background px-3" />
            </label>
            <Button type="submit" className="w-full">
              Run setup
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
