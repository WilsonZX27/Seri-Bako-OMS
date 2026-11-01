import { NextResponse, type NextRequest } from "next/server";
import { buildLoginHref } from "@/lib/http/session-recovery";

/** Carry only SDK-issued updates; never manufacture or clear session cookies. */
export function withSessionCookies(response: NextResponse, result: NextResponse) {
  response.cookies.getAll().forEach(cookie => result.cookies.set(cookie));
  result.headers.set("Cache-Control", "private, no-store");
  return result;
}

/** Only document GETs get HTML. API/RSC/writes stay fail-closed JSON. */
export function sessionUnavailableResponse(request: NextRequest, response: NextResponse, message: string) {
  const document = request.method === "GET" && !request.nextUrl.pathname.startsWith("/api/")
    && request.headers.get("rsc") !== "1" && request.headers.get("accept")?.includes("text/html");
  const headers = { "Retry-After": "5" };
  const result = document
    ? new NextResponse(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Session verification unavailable</title><style>body{font:16px/1.5 system-ui,sans-serif;margin:0;background:#f7f5f0;color:#172d24}main{max-width:38rem;margin:8vh auto;padding:1.5rem}h1{font-size:1.5rem}a{display:inline-block;box-sizing:border-box;min-height:44px;padding:.75rem;margin:.25rem .5rem .25rem 0;color:inherit;background:white;border:1px solid #b8c4be;border-radius:.5rem}</style></head><body><main><h1>Unable to verify your session</h1><p>We could not confirm your sign-in status. Try again shortly, or sign in again.</p><p>This page request was not processed. No action has been retried automatically.</p><a href="">Retry this page</a><a href="${buildLoginHref(request.nextUrl.pathname)}">Sign in again</a></main></body></html>`, { status: 503, headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } })
    : NextResponse.json({ ok: false, message }, { status: 503, headers });
  return withSessionCookies(response, result);
}
