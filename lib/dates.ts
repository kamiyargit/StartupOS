import { Prisma } from "@prisma/client";
import dayjs from "dayjs";
import jalaliday from "jalaliday";

dayjs.extend(jalaliday);

export function toJalaliString(date: Date | string): string {
  return dayjs(date).calendar("jalali").format("YYYY/MM/DD");
}

export function toGregorianString(date: Date | string): string {
  return dayjs(date).format("YYYY-MM-DD");
}

export function jalaliToGregorian(jalali: string): Date {
  const normalized = jalali.replace(/\//g, "-");
  return dayjs(normalized, { jalali: true }).calendar("gregory").toDate();
}

export function gregorianToJalali(gregorian: string): string {
  return dayjs(gregorian).calendar("jalali").format("YYYY/MM/DD");
}

export function jalaliMonthRange(jy: number, jm: number): { start: Date; end: Date } {
  const start = dayjs(`${jy}-${jm}-1`, { jalali: true })
    .calendar("gregory")
    .startOf("day");
  const end = dayjs(`${jy}-${jm}-1`, { jalali: true })
    .calendar("jalali")
    .endOf("month")
    .calendar("gregory")
    .endOf("day");
  return { start: start.toDate(), end: end.toDate() };
}

export function jalaliYearRange(jy: number): { start: Date; end: Date } {
  const start = dayjs(`${jy}-1-1`, { jalali: true })
    .calendar("gregory")
    .startOf("day");
  const end = dayjs(`${jy}-12-1`, { jalali: true })
    .calendar("jalali")
    .endOf("month")
    .calendar("gregory")
    .endOf("day");
  return { start: start.toDate(), end: end.toDate() };
}

export function currentJalaliMonth(): { year: number; month: number } {
  const now = dayjs().calendar("jalali");
  return { year: now.year(), month: now.month() + 1 };
}

export function defaultMinJalaliYear(): number {
  return currentJalaliMonth().year - 1;
}

export function jalaliYearOptions(minYear: number, maxYear?: number): number[] {
  const max = maxYear ?? currentJalaliMonth().year + 1;
  if (minYear > max) return [minYear];
  return Array.from({ length: max - minYear + 1 }, (_, index) => minYear + index);
}

export function minGregorianDateFromJalaliYear(jy: number): Date {
  return jalaliYearRange(jy).start;
}

export function isDateBeforeMinJalaliYear(date: Date, minJalaliYear: number): boolean {
  const minDate = minGregorianDateFromJalaliYear(minJalaliYear);
  return date.getTime() < minDate.getTime();
}

export function minJalaliYearErrorMessage(minJalaliYear: number): string {
  return `تاریخ نمی‌تواند قبل از سال ${minJalaliYear} باشد.`;
}

/** Parse comma-separated month numbers (1–12); empty input means all months. */
export function parseMonthList(input: string | null): number[] {
  if (!input?.trim()) return [];
  const seen = new Set<number>();
  const months: number[] = [];
  for (const part of input.split(",")) {
    const n = Number(part.trim());
    if (!Number.isInteger(n) || n < 1 || n > 12 || seen.has(n)) continue;
    seen.add(n);
    months.push(n);
  }
  return months.sort((a, b) => a - b);
}

export type JalaliYearScope = number | "all";

export function jalaliPeriodRanges(options: {
  jy: JalaliYearScope;
  months: number[];
  minJalaliYear: number;
  maxJalaliYear?: number;
}): { start: Date; end: Date }[] {
  const { jy, months, minJalaliYear } = options;
  const maxYear = options.maxJalaliYear ?? currentJalaliMonth().year + 1;
  const effectiveMonths =
    months.length === 0 ? Array.from({ length: 12 }, (_, i) => i + 1) : months;

  if (jy !== "all") {
    if (effectiveMonths.length === 12) {
      return [jalaliYearRange(jy)];
    }
    return effectiveMonths.map((jm) => jalaliMonthRange(jy, jm));
  }

  if (effectiveMonths.length === 12) {
    const { start } = jalaliYearRange(minJalaliYear);
    const { end } = jalaliYearRange(maxYear);
    return [{ start, end }];
  }

  const years = jalaliYearOptions(minJalaliYear, maxYear);
  return years.flatMap((year) =>
    effectiveMonths.map((jm) => jalaliMonthRange(year, jm)),
  );
}

export function periodWhereFromFilters(
  baseWhere: Prisma.ExpenseWhereInput,
  options: {
    jy: JalaliYearScope;
    months: number[];
    minJalaliYear: number;
    maxJalaliYear?: number;
  },
): Prisma.ExpenseWhereInput {
  const ranges = jalaliPeriodRanges(options);
  if (ranges.length === 0) return baseWhere;
  if (ranges.length === 1) {
    const { start, end } = ranges[0];
    return { ...baseWhere, factorDate: { gte: start, lte: end } };
  }
  return {
    ...baseWhere,
    OR: ranges.map(({ start, end }) => ({
      factorDate: { gte: start, lte: end },
    })),
  };
}
