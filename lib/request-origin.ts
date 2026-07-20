import type { NextRequest } from "next/server";

/** Preserve tenant subdomain in unified dev (avoid NEXTAUTH_URL localhost redirects). */
export function requestOrigin(req: Pick<NextRequest, "headers" | "nextUrl">): string {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost?.split(",")[0]?.trim() || req.headers.get("host");
  if (!host) return req.nextUrl.origin;

  const forwardedProto = req.headers.get("x-forwarded-proto");
  const protocol =
    forwardedProto?.split(",")[0]?.trim() ||
    req.nextUrl.protocol.replace(":", "") ||
    "http";

  return `${protocol}://${host}`;
}

export function requestUrl(path: string, req: Pick<NextRequest, "headers" | "nextUrl">): URL {
  return new URL(path, requestOrigin(req));
}
