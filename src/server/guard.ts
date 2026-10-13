import "server-only";
import { NextResponse } from "next/server";
import { isJsonContentType, isLoopbackHost, isSameOrigin } from "@/lib/request-guard";

const forbidden = (error: string, status = 403) => NextResponse.json({ error }, { status });

function crossOrigin(request: Request): NextResponse | null {
  return isSameOrigin(request.headers.get("origin"), request.headers.get("host"))
    ? null
    : forbidden("Cross-origin requests are not allowed.");
}

/**
 * Guard for state-changing JSON endpoints. Browsers send a cross-site `text/plain` POST without a
 * preflight, so we require a JSON content type AND a matching Origin.
 */
export function rejectUnlessSameOriginJson(request: Request): NextResponse | null {
  return (
    crossOrigin(request) ??
    (isJsonContentType(request.headers.get("content-type"))
      ? null
      : forbidden("Content-Type must be application/json.", 415))
  );
}

/** For the endpoint that runs the agents: only from this machine, same origin. */
export function rejectUnlessLoopback(request: Request): NextResponse | null {
  return isLoopbackHost(request.headers.get("host"))
    ? crossOrigin(request)
    : forbidden("Admin tools are only available on localhost.");
}
