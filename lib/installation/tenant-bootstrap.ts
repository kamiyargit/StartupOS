import { execSync } from "child_process";
import bcrypt from "bcryptjs";
import dayjs from "dayjs";
import jalaliday from "jalaliday";
import { PrismaClient, Role } from "@prisma/client";
import { DEFAULT_APP_SETTINGS } from "@/lib/app-settings";
import { getMode, INSTALLER_VERSION } from "@/lib/deployment";
import { markInProgress } from "@/lib/installation/installation-service";
import { DEFAULT_BOARD_COLUMNS } from "@/lib/task-mapper";

export type TenantBootstrapInput = {
  organizationSlug: string;
  admin: {
    username: string;
    email: string;
    phone: string;
    passwordHash: string;
    fullName: string;
  };
  branding: {
    appName: string;
    appNameShort: string;
    appNameFa: string;
    tagline?: string | null;
    logoUrl?: string | null;
    iconUrl?: string | null;
    themeColor: string;
  };
};

function defaultMinJalaliYear(): number {
  dayjs.extend(jalaliday);
  return dayjs().calendar("jalali").year() - 1;
}

function pushTenantSchema(databaseUrl: string) {
  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "pipe",
  });
}

export async function bootstrapTenantDatabase(
  databaseUrl: string,
  input: TenantBootstrapInput,
): Promise<string> {
  pushTenantSchema(databaseUrl);

  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });

  try {
    await prisma.$executeRawUnsafe(`SELECT 1`);

    await prisma.installationState.upsert({
      where: { id: "singleton" },
      update: {
        status: "IN_PROGRESS",
        deploymentMode: getMode(),
        organizationSlug: input.organizationSlug,
      },
      create: {
        id: "singleton",
        status: "IN_PROGRESS",
        deploymentMode: getMode(),
        installerVersion: INSTALLER_VERSION,
        organizationSlug: input.organizationSlug,
      },
    });

    const user = await prisma.user.create({
      data: {
        username: input.admin.username,
        email: input.admin.email,
        phone: input.admin.phone || null,
        passwordHash: input.admin.passwordHash,
        fullName: input.admin.fullName,
        role: Role.SUPER_ADMIN,
        isSuperAdmin: true,
        phoneVerified: true,
        phoneVerifiedAt: new Date(),
        isActive: true,
      },
    });

    await prisma.appSettings.upsert({
      where: { id: "default" },
      update: {
        appName: input.branding.appName,
        appNameShort: input.branding.appNameShort,
        appNameFa: input.branding.appNameFa,
        tagline: input.branding.tagline ?? null,
        logoUrl: input.branding.logoUrl ?? DEFAULT_APP_SETTINGS.logoUrl,
        iconUrl: input.branding.iconUrl ?? DEFAULT_APP_SETTINGS.iconUrl,
        themeColor: input.branding.themeColor,
        minJalaliYear: defaultMinJalaliYear(),
      },
      create: {
        id: "default",
        minJalaliYear: defaultMinJalaliYear(),
        appName: input.branding.appName,
        appNameShort: input.branding.appNameShort,
        appNameFa: input.branding.appNameFa,
        tagline: input.branding.tagline ?? null,
        logoUrl: input.branding.logoUrl ?? DEFAULT_APP_SETTINGS.logoUrl,
        iconUrl: input.branding.iconUrl ?? DEFAULT_APP_SETTINGS.iconUrl,
        themeColor: input.branding.themeColor,
      },
    });

    const taskLabels = ["فوری", "همکاری", "مالی"];
    for (const name of taskLabels) {
      await prisma.taskLabel.upsert({
        where: { name },
        update: {},
        create: { name, color: "#534AB7" },
      });
    }

    const incomeCategories = [
      { name: "فروش محصول", color: "#2563eb" },
      { name: "خدمات", color: "#0891b2" },
      { name: "مشاوره", color: "#6366f1" },
    ];
    for (const { name, color } of incomeCategories) {
      await prisma.incomeCategory.upsert({
        where: { name },
        update: { color },
        create: { name, color },
      });
    }

    await prisma.taskBoard.create({
      data: {
        name: "Default Board",
        settings: { columns: [...DEFAULT_BOARD_COLUMNS] },
      },
    });

    return user.id;
  } finally {
    await prisma.$disconnect();
  }
}

/** Bootstrap using default app prisma (dev single-DB mode). */
export async function bootstrapCurrentTenant(input: TenantBootstrapInput): Promise<string> {
  const { prisma } = await import("@/lib/prisma");

  await markInProgress(input.organizationSlug);

  const user = await prisma.user.create({
    data: {
      username: input.admin.username,
      email: input.admin.email,
      phone: input.admin.phone || null,
      passwordHash: input.admin.passwordHash,
      fullName: input.admin.fullName,
      role: Role.SUPER_ADMIN,
      isSuperAdmin: true,
      phoneVerified: true,
      phoneVerifiedAt: new Date(),
      isActive: true,
    },
  });

  await prisma.appSettings.upsert({
    where: { id: "default" },
    update: {
      appName: input.branding.appName,
      appNameShort: input.branding.appNameShort,
      appNameFa: input.branding.appNameFa,
      tagline: input.branding.tagline ?? null,
      logoUrl: input.branding.logoUrl ?? DEFAULT_APP_SETTINGS.logoUrl,
      iconUrl: input.branding.iconUrl ?? DEFAULT_APP_SETTINGS.iconUrl,
      themeColor: input.branding.themeColor,
    },
    create: {
      id: "default",
      minJalaliYear: defaultMinJalaliYear(),
      appName: input.branding.appName,
      appNameShort: input.branding.appNameShort,
      appNameFa: input.branding.appNameFa,
      tagline: input.branding.tagline ?? null,
      logoUrl: input.branding.logoUrl ?? DEFAULT_APP_SETTINGS.logoUrl,
      iconUrl: input.branding.iconUrl ?? DEFAULT_APP_SETTINGS.iconUrl,
      themeColor: input.branding.themeColor,
    },
  });

  return user.id;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}
