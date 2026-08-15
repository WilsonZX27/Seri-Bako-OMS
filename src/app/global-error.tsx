"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en"><body><style>{`
    *{box-sizing:border-box} body{margin:0;background:#f4f7f5;color:#10251d;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
    .sb-global-error{display:flex;min-height:100dvh;align-items:center;justify-content:center;padding:24px}
    .sb-global-error-card{width:100%;max-width:560px;border:1px solid #ccd8d2;background:#fff;padding:24px;box-shadow:0 8px 28px rgba(16,37,29,.1)}
    .sb-global-error h1{margin:0;font-size:22px;line-height:1.3}.sb-global-error p{margin:8px 0 0;color:#5e6f67;font-size:14px;line-height:1.5}
    .sb-global-error-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:20px}
    .sb-global-error :is(button,a){display:inline-flex;min-height:44px;align-items:center;justify-content:center;border:1px solid #075942;padding:0 16px;font:600 14px inherit;text-decoration:none;cursor:pointer}
    .sb-global-error button{background:#075942;color:#fff}.sb-global-error a{background:#fff;color:#075942}
    .sb-global-error :is(button,a):focus-visible{outline:3px solid rgba(7,89,66,.28);outline-offset:2px}
    @media(max-width:420px){.sb-global-error-actions{grid-template-columns:1fr}}
  `}</style><main className="sb-global-error" aria-labelledby="global-error-title"><section className="sb-global-error-card" role="alert"><h1 id="global-error-title">Seri Bako OMS is temporarily unavailable</h1><p>The application shell could not load. Try again, or return to the dashboard.</p>{error.digest ? <p>Reference: {error.digest}</p> : null}<div className="sb-global-error-actions"><button type="button" onClick={reset}>Try again</button><a href="/dashboard">Return to dashboard</a></div></section></main></body></html>;
}
