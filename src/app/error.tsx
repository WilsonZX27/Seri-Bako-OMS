"use client";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const missingRecord = /Cannot coerce the result to a single JSON object/i.test(error.message);
  return <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center gap-4 p-6"><h1 className="text-xl font-semibold">{missingRecord ? "Record unavailable" : "This page could not load"}</h1><p className="text-sm text-muted-foreground">{missingRecord ? "This record is not available in the current workspace, or it has already been removed." : "The error was recorded safely. Try again, or return to the dashboard."}</p><div className="flex gap-2"><button className="rounded-[2px] bg-primary px-3 py-2 text-sm text-primary-foreground" onClick={() => reset()}>Try again</button><a className="rounded-[2px] border px-3 py-2 text-sm" href="/dashboard">Dashboard</a></div></main>;
}
