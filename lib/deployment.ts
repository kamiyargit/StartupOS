import { headers } from "next/headers";

export type KartinPlane = "control" | "tenant";
export type KartinMode = "cloud" | "self_hosted";

/** @deprecated Use KartinPlane */
export type StartupOsPlane = KartinPlane;
/** @deprecated Use KartinMode */
export type StartupOsMode = KartinMode;

export const INSTALLER_VERSION = "1.0.0";

function envPlane(): string | undefined {
  return process.env.KARTIN_PLANE ?? process.env.STARTUPOS_PLANE;
}

function envMode(): string | undefined {
  return process.env.KARTIN_MODE ?? process.env.STARTUPOS_MODE;
}

function envBaseDomain(): string | undefined {
  return process.env.KARTIN_BASE_DOMAIN ?? process.env.STARTUPOS_BASE_DOMAIN;
}

/** Single dev container: route control vs tenant by Host header. */
export function isUnifiedDev(): boolean {
  return process.env.KARTIN_UNIFIED_DEV === "true";
}

export function resolvePlaneFromHost(host: string | null | undefined): KartinPlane {
  const hostname = (host ?? "").split(":")[0].toLowerCase();
  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") {
    return "control";
  }
  if (hostname === "portal.localhost" || hostname.startsWith("setup.")) {
    return "control";
  }
  if (hostname.endsWith(".localhost")) {
    return "tenant";
  }

  const base = getBaseDomain();
  const portal = setupHost().split(":")[0].toLowerCase();
  if (hostname === base || hostname === portal) {
    return "control";
  }
  if (hostname.endsWith(`.${base}`)) {
    return "tenant";
  }

  return envPlane() === "control" ? "control" : "tenant";
}

/** Product toggle: when false, only SaaS cloud mode is offered. */
export function isSelfHostedEnabled(): boolean {
  return process.env.ENABLE_SELF_HOSTED === "true";
}

export async function resolvePlane(): Promise<KartinPlane> {
  if (isUnifiedDev()) {
    const h = await headers();
    const planeHeader = h.get("x-kartin-plane");
    if (planeHeader === "control" || planeHeader === "tenant") {
      return planeHeader;
    }
    const host = h.get("host");
    if (host) return resolvePlaneFromHost(host);
  }

  return envPlane() === "control" ? "control" : "tenant";
}

export function getPlane(): KartinPlane {
  return envPlane() === "control" ? "control" : "tenant";
}

export function getPlaneForHost(host: string | null | undefined): KartinPlane {
  if (isUnifiedDev()) return resolvePlaneFromHost(host);
  return envPlane() === "control" ? "control" : "tenant";
}

export function getMode(): KartinMode {
  if (!isSelfHostedEnabled()) return "cloud";
  return envMode() === "cloud" ? "cloud" : "self_hosted";
}

export function isControlPlane(): boolean {
  return getPlane() === "control";
}

export async function isControlPlaneAsync(): Promise<boolean> {
  return (await resolvePlane()) === "control";
}

export function isControlPlaneForHost(host: string | null | undefined): boolean {
  return getPlaneForHost(host) === "control";
}

export function isTenantPlane(): boolean {
  return getPlane() === "tenant";
}

export function isCloudMode(): boolean {
  return getMode() === "cloud";
}

export function isSelfHostedMode(): boolean {
  return getMode() === "self_hosted";
}

export function getBaseDomain(): string {
  return envBaseDomain() ?? "kartin.ir";
}

export function tenantUrl(slug: string): string {
  const base = getBaseDomain();
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const port = process.env.NODE_ENV === "production" ? "" : ":5568";
  if (process.env.NODE_ENV === "production") {
    return `${protocol}://${slug}.${base}`;
  }
  return `${protocol}://${slug}.localhost${port}`;
}

export function tenantSlugFromHost(host: string | null | undefined): string | null {
  const hostname = (host ?? "").split(":")[0].toLowerCase();
  if (!hostname) return null;

  if (hostname.endsWith(".localhost")) {
    const slug = hostname.slice(0, -".localhost".length);
    if (!slug || slug === "portal" || slug === "setup" || slug === "www") return null;
    return slug;
  }

  const base = getBaseDomain();
  const portal = setupHost().split(":")[0].toLowerCase();
  if (hostname === base || hostname === portal) return null;

  if (hostname.endsWith(`.${base}`)) {
    const slug = hostname.slice(0, -(base.length + 1));
    return slug || null;
  }

  return null;
}

export function setupHost(): string {
  const fromEnv = process.env.SETUP_HOST ?? process.env.KARTIN_SETUP_HOST;
  if (fromEnv) return fromEnv;
  return `portal.${getBaseDomain()}`;
}
