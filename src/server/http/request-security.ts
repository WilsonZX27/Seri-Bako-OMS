import { NextResponse } from "next/server";

/**
 * Browser mutations must originate from the same application origin. API
 * clients without an Origin header remain subject to session and permission
 * checks; a browser that explicitly identifies another origin is rejected.
 */
export function rejectCrossSiteMutation(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const requestOrigin = new URL(request.url).origin;

  if (origin && origin !== requestOrigin) {
    return NextResponse.json({ ok: false, message: "This request was blocked because it did not originate from this application." }, { status: 403 });
  }

  if (!origin && fetchSite === "cross-site") {
    return NextResponse.json({ ok: false, message: "This cross-site request was blocked." }, { status: 403 });
  }

  return null;
}
