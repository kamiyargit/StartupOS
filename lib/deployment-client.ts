/** Client-safe deployment helpers (no secrets). */

export function isSelfHostedEnabledClient(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_SELF_HOSTED === "true";
}

export function setupPortalUrl(): string {
  if (process.env.NEXT_PUBLIC_SETUP_PORTAL_URL) {
    return process.env.NEXT_PUBLIC_SETUP_PORTAL_URL;
  }
  const host = process.env.NEXT_PUBLIC_SETUP_HOST ?? "portal.kartin.ir";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}/setup`;
}

export function setupHost(): string {
  if (process.env.NEXT_PUBLIC_SETUP_HOST) {
    return process.env.NEXT_PUBLIC_SETUP_HOST;
  }
  return "portal.kartin.ir";
}

export function getBaseDomain(): string {
  return process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "kartin.ir";
}

export function tenantLoginUrl(slug: string): string {
  const base = getBaseDomain();
  if (base === "localhost" || process.env.NEXT_PUBLIC_TENANT_PORT === "5568") {
    return `http://${slug}.localhost:5568/login`;
  }
  return `https://${slug}.${base}/login`;
}

export function isAdminRole(role: string): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function isSuperAdminRole(role: string): boolean {
  return role === "SUPER_ADMIN";
}
