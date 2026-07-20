import { AppSettings, TwoFactorPolicy } from "@prisma/client";
import { AppSettingsDTO } from "@/lib/dto";
import {
  currentJalaliMonth,
  defaultMinJalaliYear,
  isDateBeforeMinJalaliYear,
  minJalaliYearErrorMessage,
} from "@/lib/dates";
import { prisma } from "@/lib/prisma";

const SETTINGS_ID = "default";
const MIN_YEAR = 1300;
const MAX_YEAR = 1500;

export const DEFAULT_APP_SETTINGS = {
  appName: "Kartin",
  appNameShort: "Kartin",
  appNameFa: "کارتین",
  tagline: "سیستم مدیریت هوشمند کسب‌وکار",
  logoUrl: "/logo.svg",
  iconUrl: "/icons/icon-512.png",
  themeColor: "#534AB7",
} as const;

function mapSettings(settings: AppSettings): AppSettingsDTO {
  return {
    minJalaliYear: settings.minJalaliYear,
    twoFactorPolicy: settings.twoFactorPolicy,
    appName: settings.appName,
    appNameShort: settings.appNameShort,
    appNameFa: settings.appNameFa,
    tagline: settings.tagline,
    logoUrl: settings.logoUrl,
    iconUrl: settings.iconUrl,
    themeColor: settings.themeColor,
    updatedAt: settings.updatedAt.toISOString(),
  };
}

export function validateMinJalaliYear(value: unknown): number | null {
  const year = Number(value);
  if (!Number.isInteger(year)) return null;
  if (year < MIN_YEAR || year > MAX_YEAR) return null;
  if (year > currentJalaliMonth().year + 1) return null;
  return year;
}

export async function getAppSettings(): Promise<AppSettingsDTO> {
  try {
    let settings = await prisma.appSettings.findUnique({ where: { id: SETTINGS_ID } });
    if (!settings) {
      settings = await prisma.appSettings.create({
        data: {
          id: SETTINGS_ID,
          minJalaliYear: defaultMinJalaliYear(),
          ...DEFAULT_APP_SETTINGS,
        },
      });
    }
    return mapSettings(settings);
  } catch {
    return {
      minJalaliYear: defaultMinJalaliYear(),
      twoFactorPolicy: "OPTIONAL",
      ...DEFAULT_APP_SETTINGS,
      tagline: DEFAULT_APP_SETTINGS.tagline,
      logoUrl: DEFAULT_APP_SETTINGS.logoUrl,
      iconUrl: DEFAULT_APP_SETTINGS.iconUrl,
      updatedAt: new Date().toISOString(),
    };
  }
}

export async function updateAppSettings(input: {
  minJalaliYear?: unknown;
  twoFactorPolicy?: unknown;
  appName?: unknown;
  appNameShort?: unknown;
  appNameFa?: unknown;
  tagline?: unknown;
  logoUrl?: unknown;
  iconUrl?: unknown;
  themeColor?: unknown;
}): Promise<AppSettingsDTO> {
  const data: Partial<AppSettings> = {};

  if (input.minJalaliYear !== undefined) {
    const minJalaliYear = validateMinJalaliYear(input.minJalaliYear);
    if (minJalaliYear === null) throw new Error("INVALID_MIN_JALALI_YEAR");
    data.minJalaliYear = minJalaliYear;
  }

  if (input.twoFactorPolicy === "OPTIONAL" || input.twoFactorPolicy === "MANDATORY") {
    data.twoFactorPolicy = input.twoFactorPolicy as TwoFactorPolicy;
  }

  if (typeof input.appName === "string" && input.appName.trim()) {
    data.appName = input.appName.trim();
  }
  if (typeof input.appNameShort === "string" && input.appNameShort.trim()) {
    data.appNameShort = input.appNameShort.trim();
  }
  if (typeof input.appNameFa === "string" && input.appNameFa.trim()) {
    data.appNameFa = input.appNameFa.trim();
  }
  if (input.tagline !== undefined) {
    data.tagline = typeof input.tagline === "string" ? input.tagline.trim() || null : null;
  }
  if (input.logoUrl !== undefined) {
    data.logoUrl = typeof input.logoUrl === "string" ? input.logoUrl.trim() || null : null;
  }
  if (input.iconUrl !== undefined) {
    data.iconUrl = typeof input.iconUrl === "string" ? input.iconUrl.trim() || null : null;
  }
  if (typeof input.themeColor === "string" && /^#[0-9a-fA-F]{6}$/.test(input.themeColor)) {
    data.themeColor = input.themeColor;
  }

  const settings = await prisma.appSettings.upsert({
    where: { id: SETTINGS_ID },
    update: data,
    create: {
      id: SETTINGS_ID,
      minJalaliYear: defaultMinJalaliYear(),
      ...DEFAULT_APP_SETTINGS,
      ...data,
    },
  });

  return mapSettings(settings);
}

export async function validateDateAgainstAppSettings(
  date: Date,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const settings = await getAppSettings();
  if (isDateBeforeMinJalaliYear(date, settings.minJalaliYear)) {
    return { ok: false, message: minJalaliYearErrorMessage(settings.minJalaliYear) };
  }
  return { ok: true };
}

export async function isTwoFactorMandatory(): Promise<boolean> {
  const settings = await getAppSettings();
  return settings.twoFactorPolicy === "MANDATORY";
}
