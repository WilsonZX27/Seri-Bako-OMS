import Link from "next/link";
import { Factory } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_SPRINT, APP_VERSION } from "@/lib/app-version";
import { getCompanyBranding } from "@/server/queries/common";

export async function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const branding = await getCompanyBranding();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(217,154,43,0.18),_transparent_35%),linear-gradient(180deg,_#f7f5ef_0%,_#eef3ef_100%)] p-6">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-5xl items-center gap-8 lg:grid-cols-[1.1fr_440px]">
        <section className="rounded-none border border-primary/10 bg-white/65 p-6 shadow-sm backdrop-blur">
          <Link href="/login" className="inline-flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-none border border-[var(--sb-border-soft)] bg-white text-[var(--sb-primary-dark)]">
              {branding.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.logo_url} alt={`${branding.company_name} logo`} className="h-full w-full object-contain p-1" />
              ) : (
                <Factory className="h-6 w-6" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">Seri Bako OMS</p>
              <h1 className="text-2xl font-semibold text-[var(--sb-primary-dark)]">{branding.company_name}</h1>
            </div>
          </Link>
          <div className="mt-8 max-w-xl">
            <p className="text-3xl font-semibold leading-tight text-[var(--sb-primary-dark)]">Sign in to manage Seri Bako operations.</p>
            <p className="mt-3 max-w-lg text-xs leading-5 text-muted-foreground">
              Manage purchasing, stock, production, and approvals in one branch-ready workspace.
            </p>
          </div>
        </section>
        <Card className="border-primary/10 shadow-lg">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            {children}
            <div className="mt-6 border-t pt-4 text-center text-xs text-muted-foreground">
              <div>Seri Bako OMS v{APP_VERSION}</div>
              <div>{APP_SPRINT}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
