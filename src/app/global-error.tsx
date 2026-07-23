"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html><body><main style={{ padding: 24, fontFamily: "sans-serif" }}><h1>Seri Bako OMS is temporarily unavailable</h1><p>Please try again.</p><button onClick={() => reset()}>Try again</button></main></body></html>;
}
