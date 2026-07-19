import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/server/actions/auth";

const messages: Record<string, string> = {
  inactive: "Your staff account is inactive. Ask the Super Admin / Owner to restore access.",
  "missing-profile": "Your login is not linked to a staff profile. Ask the Super Admin / Owner to check the account assignment.",
  "no-permitted-route": "Your staff account has no permitted workspace. Ask the Super Admin / Owner to review its role and permissions.",
};

export default async function AccessStatusPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  if (reason === "idle-timeout") {
    return (
      <AuthShell title="Session ended" description="Your session ended due to inactivity. Please sign in again.">
        <Button asChild className="w-full"><Link href="/login">Sign in again</Link></Button>
      </AuthShell>
    );
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <AuthShell title="Workspace access unavailable" description="Your authentication succeeded, but this account cannot open an operational workspace.">
      <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
        {messages[reason ?? ""] ?? messages["no-permitted-route"]}
      </p>
      <form action={signOut} className="mt-4">
        <SubmitButton type="submit" variant="outline" className="w-full" pendingLabel="Signing out...">Sign out</SubmitButton>
      </form>
    </AuthShell>
  );
}
