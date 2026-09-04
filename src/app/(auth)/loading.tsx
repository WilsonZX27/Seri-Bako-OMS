export default function AuthLoading() {
  return (
    <div className="grid min-h-dvh place-items-center bg-[var(--workspace-bg)] px-4" aria-live="polite" aria-busy="true">
      <span className="sr-only" role="status">Preparing sign in…</span>
      <div className="w-full max-w-sm space-y-5 rounded-[var(--sb-panel-radius)] bg-white p-6 shadow-[0_4px_8px_rgba(10,58,43,0.08)]" aria-hidden="true">
        <div className="mx-auto sb-skeleton h-12 w-12 rounded-full" />
        <div className="space-y-2 text-center"><div className="mx-auto sb-skeleton h-5 w-40" /><div className="mx-auto sb-skeleton h-3 w-56 max-w-full" /></div>
        <div className="space-y-3"><div className="sb-skeleton h-10 w-full" /><div className="sb-skeleton h-10 w-full" /><div className="sb-skeleton h-10 w-full" /></div>
      </div>
    </div>
  );
}
