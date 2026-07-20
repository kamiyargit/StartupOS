import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getAppSettings } from "@/lib/app-settings";
import { isControlPlaneForHost, isUnifiedDev, resolvePlaneFromHost } from "@/lib/deployment";
import { resolveInstallationGuard } from "@/lib/installation/installation-guard";
import { requestUrl } from "@/lib/request-origin";
import { isAdminRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const host = req.headers.get("host");

  const requestHeaders = new Headers(req.headers);
  if (isUnifiedDev()) {
    requestHeaders.set("x-kartin-plane", resolvePlaneFromHost(host));
  }

  const isStaticPublic =
    pathname === "/robots.txt" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/icons/") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/api/health");

  if (!isStaticPublic) {
    try {
      const guard = await resolveInstallationGuard(pathname, host);
      if (guard.action === "redirect") {
        return NextResponse.redirect(requestUrl(guard.url, req));
      }
    } catch {
      /* DB may be unavailable during first boot — allow setup/health routes */
      if (!isControlPlaneForHost(host) && !pathname.startsWith("/install/") && !pathname.startsWith("/api/installation")) {
        return NextResponse.redirect(requestUrl("/install/pending", req));
      }
    }
  }

  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/auth/complete-setup") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/install/") ||
    pathname.startsWith("/setup") ||
    pathname.startsWith("/api/setup") ||
    pathname.startsWith("/api/provisioning") ||
    pathname.startsWith("/api/installation") ||
    pathname.startsWith("/api/dev/") ||
    pathname === "/api/settings" ||
    pathname === "/robots.txt" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/icons/") ||
    pathname === "/api/health";

  if (!isLoggedIn && !isPublic && !isStaticPublic) {
    const loginUrl = requestUrl("/login", req);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(requestUrl("/dashboard", req));
  }

  if (pathname.startsWith("/admin") && req.auth?.user?.role && !isAdminRole(req.auth.user.role)) {
    return NextResponse.redirect(requestUrl("/dashboard", req));
  }

  if (isLoggedIn && req.auth?.user?.id) {
    const twoFactorSetupAllowed =
      pathname === "/settings/security" ||
      pathname.startsWith("/settings/security") ||
      pathname.startsWith("/api/auth/2fa");

    if (!twoFactorSetupAllowed) {
      try {
        const settings = await getAppSettings();
        if (settings.twoFactorPolicy === "MANDATORY") {
          const user = await prisma.user.findUnique({
            where: { id: req.auth.user.id },
            select: { twoFactorEnabled: true },
          });
          if (!user?.twoFactorEnabled) {
            const setupUrl = requestUrl("/settings/security", req);
            setupUrl.searchParams.set("required", "1");
            return NextResponse.redirect(setupUrl);
          }
        }
      } catch {
        /* allow through if settings check fails */
      }
    }
  }

  const response = NextResponse.next({
    request: isUnifiedDev() ? { headers: requestHeaders } : undefined,
  });
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\..*).*)"],
};
