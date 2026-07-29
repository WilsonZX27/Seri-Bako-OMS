import { Factory } from "lucide-react";
import { APP_RELEASE_NOTE } from "@/lib/app-version";
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
    <main className="flex min-h-dvh items-center justify-center bg-[var(--sb-bg)] px-4 py-8 sm:px-6">
      <section className="w-full max-w-[26rem]" aria-labelledby="auth-title">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden border border-[var(--sb-green-800)] bg-[var(--sb-green-950)] text-white">
            {branding.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logo_url} alt="" className="h-full w-full object-contain bg-white p-1" />
            ) : (
              <Factory className="h-5 w-5" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold leading-tight text-[var(--sb-green-950)]">{branding.company_name}</p>
            <p className="mt-0.5 text-xs text-[var(--sb-text-muted)]">Operations Management System</p>
          </div>
        </div>

        <div className="border border-[var(--sb-border)] bg-white p-5 sm:p-6">
          <header className="mb-5">
            <h1 id="auth-title" className="text-lg font-semibold leading-snug text-[var(--sb-text)]">{title}</h1>
            <p className="mt-1 text-sm leading-5 text-[var(--sb-text-muted)]">{description}</p>
          </header>
          {children}
        </div>

        <footer className="mt-4 flex items-center justify-between gap-3 text-xs text-[var(--sb-text-muted)]">
          <span>Seri Bako OMS</span>
          <span>{APP_RELEASE_NOTE}</span>
        </footer>
      </section>
    </main>
  );
}
