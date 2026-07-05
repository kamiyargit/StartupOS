import { AppSettings } from "@prisma/client";
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

function mapSettings(settings: AppSettings): AppSettingsDTO {
  return {
    minJalaliYear: settings.minJalaliYear,
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
  let settings = await prisma.appSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (!settings) {
    settings = await prisma.appSettings.create({
      data: { id: SETTINGS_ID, minJalaliYear: defaultMinJalaliYear() },
    });
  }
  return mapSettings(settings);
}

export async function updateAppSettings(input: {
  minJalaliYear: unknown;
}): Promise<AppSettingsDTO> {
  const minJalaliYear = validateMinJalaliYear(input.minJalaliYear);
  if (minJalaliYear === null) {
    throw new Error("INVALID_MIN_JALALI_YEAR");
  }

  const settings = await prisma.appSettings.upsert({
    where: { id: SETTINGS_ID },
    update: { minJalaliYear },
    create: { id: SETTINGS_ID, minJalaliYear },
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
