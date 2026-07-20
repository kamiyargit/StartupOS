import { InstallationStatus } from "@prisma/client";
import { isControlPlaneForHost, isUnifiedDev, resolvePlaneFromHost } from "@/lib/deployment";
import { getTenantInstallationState, isTenantInstallationReady } from "@/lib/installation/installation-service";

const INSTALL_PUBLIC_PREFIXES = [
  "/install/",
  "/auth/complete-setup",
  "/api/installation/",
  "/api/health",
  "/robots.txt",
  "/manifest.webmanifest",
  "/sw.js",
  "/icons/",
  "/favicon.ico",
];

const SETUP_PUBLIC_PREFIXES = [
  "/setup",
  "/api/setup",
  "/api/provisioning",
  "/api/dev/sms",
];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p));
}

export type InstallationGuardResult =
  | { action: "allow" }
  | { action: "redirect"; url: string };

export async function resolveInstallationGuard(
  pathname: string,
  host?: string | null,
): Promise<InstallationGuardResult> {
  const control = isUnifiedDev() ? resolvePlaneFromHost(host) === "control" : isControlPlaneForHost(host);
  const tenant = isUnifiedDev() ? resolvePlaneFromHost(host) === "tenant" : !control;

  if (control) {
    if (matchesPrefix(pathname, SETUP_PUBLIC_PREFIXES)) return { action: "allow" };
    if (pathname === "/" || pathname === "") {
      return { action: "redirect", url: "/setup" };
    }
    if (pathname.startsWith("/api/auth")) {
      return { action: "allow" };
    }
    if (pathname === "/login") {
      return { action: "redirect", url: "/setup" };
    }
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
      return { action: "redirect", url: "/setup" };
    }
    return { action: "allow" };
  }

  if (!tenant) return { action: "allow" };

  if (matchesPrefix(pathname, INSTALL_PUBLIC_PREFIXES)) return { action: "allow" };

  // Public read — used by root layout on tenant hosts during install/bootstrap.
  if (pathname === "/api/settings" || pathname === "/api/health") return { action: "allow" };

  // Auth API must return JSON (session checks); only block the login page until installed.
  if (pathname.startsWith("/api/auth")) return { action: "allow" };

  const installed = await isTenantInstallationReady(host);
  if (installed) return { action: "allow" };

  const state = await getTenantInstallationState(host);

  if (pathname === "/login") {
    if (state.status === InstallationStatus.FAILED) {
      return { action: "redirect", url: "/install/pending?error=1" };
    }
    return { action: "redirect", url: "/install/pending" };
  }

  if (pathname === "/" || pathname === "") {
    return { action: "redirect", url: "/install/pending" };
  }

  if (state.status === InstallationStatus.IN_PROGRESS || state.status === InstallationStatus.NOT_STARTED) {
    return { action: "redirect", url: "/install/pending" };
  }

  if (state.status === InstallationStatus.FAILED) {
    return { action: "redirect", url: "/install/pending?error=1" };
  }

  return { action: "redirect", url: "/install/pending" };
}
