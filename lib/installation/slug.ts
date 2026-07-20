const RESERVED_SLUGS = new Set([
  "setup",
  "www",
  "api",
  "admin",
  "app",
  "mail",
  "smtp",
  "ftp",
  "cdn",
  "static",
  "assets",
  "help",
  "support",
  "status",
  "blog",
  "docs",
  "dev",
  "staging",
  "test",
  "demo",
  "login",
  "register",
  "signup",
  "account",
  "billing",
  "dashboard",
  "startupos",
  "kartin",
  "portal",
]);

const SLUG_PATTERN = /^[a-z][a-z0-9-]{1,30}[a-z0-9]$/;

export function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function validateSlug(slug: string): { ok: true; slug: string } | { ok: false; error: string } {
  const normalized = normalizeSlug(slug);
  if (normalized.length < 3) {
    return { ok: false, error: "شناسه زیردامنه باید حداقل ۳ کاراکتر باشد." };
  }
  if (normalized.length > 32) {
    return { ok: false, error: "شناسه زیردامنه حداکثر ۳۲ کاراکتر باشد." };
  }
  if (!SLUG_PATTERN.test(normalized)) {
    return { ok: false, error: "فقط حروف انگلیسی کوچک، عدد و خط تیره مجاز است." };
  }
  if (RESERVED_SLUGS.has(normalized)) {
    return { ok: false, error: "این شناسه رزرو شده است." };
  }
  return { ok: true, slug: normalized };
}

export { RESERVED_SLUGS };
