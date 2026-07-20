import { access, mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getBaseDomain, tenantUrl } from "@/lib/deployment";
import { isInstalled } from "@/lib/installation/installation-service";

export type ValidationCheck = {
  id: string;
  label: string;
  ok: boolean;
  message: string;
};

export type ValidationResult = {
  ok: boolean;
  checks: ValidationCheck[];
};

async function checkDatabase(client: PrismaClient): Promise<ValidationCheck> {
  try {
    await client.$queryRaw`SELECT 1`;
    const tables = await client.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' LIMIT 1
    `;
    return {
      id: "database",
      label: "پایگاه داده",
      ok: tables.length > 0,
      message: tables.length > 0 ? "اتصال برقرار است" : "جدولی یافت نشد",
    };
  } catch (e) {
    return {
      id: "database",
      label: "پایگاه داده",
      ok: false,
      message: e instanceof Error ? e.message : "خطای اتصال",
    };
  }
}

async function checkStorage(): Promise<ValidationCheck> {
  const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
  const testFile = path.join(uploadDir, `.install-test-${Date.now()}`);
  try {
    await mkdir(uploadDir, { recursive: true });
    await writeFile(testFile, "ok", "utf8");
    await access(testFile);
    await unlink(testFile);
    return { id: "storage", label: "فضای ذخیره‌سازی", ok: true, message: "خواندن/نوشتن موفق" };
  } catch (e) {
    return {
      id: "storage",
      label: "فضای ذخیره‌سازی",
      ok: false,
      message: e instanceof Error ? e.message : "خطا در ذخیره‌سازی",
    };
  }
}

async function checkMail(): Promise<ValidationCheck> {
  if (!process.env.SMTP_URL) {
    return { id: "mail", label: "پیکربندی ایمیل", ok: true, message: "اختیاری — پیکربندی نشده" };
  }
  return { id: "mail", label: "پیکربندی ایمیل", ok: true, message: "SMTP_URL تنظیم شده" };
}

async function checkAdmin(client: PrismaClient): Promise<ValidationCheck> {
  const admin = await client.user.findFirst({
    where: {
      isActive: true,
      OR: [{ role: "SUPER_ADMIN" }, { isSuperAdmin: true }],
    },
  });
  if (!admin) {
    return { id: "admin", label: "مدیر ارشد", ok: false, message: "حساب مدیر ارشد یافت نشد" };
  }
  return { id: "admin", label: "مدیر ارشد", ok: true, message: admin.username };
}

async function checkBranding(client: PrismaClient): Promise<ValidationCheck> {
  const settings = await client.appSettings.findUnique({ where: { id: "default" } });
  if (!settings?.appName) {
    return { id: "branding", label: "برندسازی", ok: false, message: "تنظیمات برند یافت نشد" };
  }
  return { id: "branding", label: "برندسازی", ok: true, message: settings.appName };
}

async function checkDomain(slug?: string): Promise<ValidationCheck> {
  if (!slug) {
    return { id: "domain", label: "دامنه", ok: false, message: "شناسه زیردامنه تعیین نشده" };
  }
  const url = tenantUrl(slug);
  if (process.env.NODE_ENV !== "production") {
    return { id: "domain", label: "دامنه", ok: true, message: `${slug}.${getBaseDomain()} (dev)` };
  }
  try {
    const res = await fetch(`${url}/api/health`, { method: "GET", signal: AbortSignal.timeout(8000) });
    return {
      id: "domain",
      label: "دامنه",
      ok: res.ok,
      message: res.ok ? url : `پاسخ ناموفق: ${res.status}`,
    };
  } catch (e) {
    return {
      id: "domain",
      label: "دامنه",
      ok: false,
      message: e instanceof Error ? e.message : "دامنه در دسترس نیست",
    };
  }
}

export async function runInstallationValidation(
  slug?: string,
  client: PrismaClient = prisma,
): Promise<ValidationResult> {
  const checks = await Promise.all([
    checkDatabase(client),
    checkStorage(),
    checkMail(),
    checkAdmin(client),
    checkBranding(client),
    checkDomain(slug),
  ]);
  return { ok: checks.every((c) => c.ok), checks };
}

export async function runInstallationValidationForDatabase(
  databaseUrl: string,
  slug?: string,
): Promise<ValidationResult> {
  const client = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    return await runInstallationValidation(slug, client);
  } finally {
    await client.$disconnect();
  }
}

export async function runTenantInstallationValidation(slug?: string): Promise<ValidationResult> {
  const installed = await isInstalled();
  const base = await runInstallationValidation(slug);
  if (!installed) {
    base.checks.push({
      id: "install_state",
      label: "وضعیت نصب",
      ok: false,
      message: "نصب تکمیل نشده",
    });
    base.ok = false;
  }
  return base;
}
