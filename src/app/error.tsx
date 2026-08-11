"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center gap-4 p-6"><h1 className="text-xl font-semibold">This page could not load</h1><p className="text-sm text-muted-foreground">The error was recorded safely. Try again, or return to the dashboard.</p><div className="flex gap-2"><button className="border bg-primary px-3 py-2 text-sm text-primary-foreground" onClick={() => reset()}>Try again</button><a className="border px-3 py-2 text-sm" href="/dashboard">Dashboard</a></div></main>;
}
