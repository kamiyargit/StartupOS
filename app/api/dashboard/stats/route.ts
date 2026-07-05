import { Prisma } from "@prisma/client";
import dayjs from "dayjs";
import jalaliday from "jalaliday";
import { requireSession, jsonError } from "@/lib/auth-helpers";
import { getAppSettings } from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";
import {
  currentJalaliMonth,
  jalaliYearOptions,
  jalaliYearRange,
  parseMonthList,
  periodWhereFromFilters,
  type JalaliYearScope,
} from "@/lib/dates";
import { DashboardStats } from "@/lib/dto";
import { sumSettledOnShare } from "@/lib/financier-payments";

dayjs.extend(jalaliday);

async function sumByCurrency(where: Prisma.ExpenseWhereInput) {
  const rows = await prisma.expense.groupBy({
    by: ["currency"],
    where,
    _sum: { amount: true },
  });

  const totals = { TOMAN: BigInt(0), USD: BigInt(0) };
  for (const row of rows) {
    totals[row.currency] = BigInt((row._sum.amount ?? 0).toString());
  }
  return totals;
}

function parseTypeIds(searchParams: URLSearchParams): string[] {
  const typeIdsParam = searchParams.get("typeIds");
  if (typeIdsParam?.trim()) {
    return [...new Set(typeIdsParam.split(",").map((id) => id.trim()).filter(Boolean))];
  }
  const typeId = searchParams.get("typeId");
  return typeId ? [typeId] : [];
}

function parseYearScope(searchParams: URLSearchParams, minJalaliYear: number): JalaliYearScope {
  const raw = searchParams.get("jy");
  if (raw === "all") return "all";
  const requested = Number(raw ?? currentJalaliMonth().year);
  return Math.max(requested, minJalaliYear);
}

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const settings = await getAppSettings();
    const minJalaliYear = settings.minJalaliYear;
    const maxJalaliYear = currentJalaliMonth().year + 1;
    const jy = parseYearScope(searchParams, minJalaliYear);
    let months = parseMonthList(searchParams.get("months"));
    if (months.length === 0) {
      const legacyMonth = searchParams.get("jm");
      if (legacyMonth) {
        const jm = Number(legacyMonth);
        if (Number.isInteger(jm) && jm >= 1 && jm <= 12) months = [jm];
      }
    }
    const typeIds = parseTypeIds(searchParams);
    const chartMode: "months" | "years" = jy === "all" ? "years" : "months";

    const baseWhere: Prisma.ExpenseWhereInput = { deletedAt: null };
    if (typeIds.length > 0) baseWhere.costFactorTypeId = { in: typeIds };
    if (userId) baseWhere.addedByUserId = userId;

    const periodWhere = periodWhereFromFilters(baseWhere, {
      jy,
      months,
      minJalaliYear,
      maxJalaliYear,
    });

    const chartWhere: Prisma.ExpenseWhereInput =
      jy === "all"
        ? periodWhere
        : {
            ...baseWhere,
            factorDate: {
              gte: jalaliYearRange(jy).start,
              lte: jalaliYearRange(jy).end,
            },
          };

    const [allTotals, periodTotals, countAll, countPeriod, byType, chartExpenses, financierShareRows] =
      await Promise.all([
        sumByCurrency(baseWhere),
        sumByCurrency(periodWhere),
        prisma.expense.count({ where: baseWhere }),
        prisma.expense.count({ where: periodWhere }),
        prisma.expense.groupBy({
          by: ["costFactorTypeId", "currency"],
          where: periodWhere,
          _sum: { amount: true },
        }),
        prisma.expense.findMany({
          where: chartWhere,
          select: { factorDate: true, amount: true, currency: true },
          orderBy: { factorDate: "asc" },
        }),
        prisma.expenseFinancierShare.findMany({
          where: {
            expense: periodWhere,
          },
          include: {
            user: { select: { id: true, fullName: true } },
            creditor: { select: { id: true, fullName: true } },
            payments: { select: { amount: true, kind: true } },
          },
        }),
      ]);

    const typeIdsFromGroup = [...new Set(byType.map((b) => b.costFactorTypeId))];
    const types = await prisma.costFactorType.findMany({
      where: { id: { in: typeIdsFromGroup } },
    });
    const typeMap = Object.fromEntries(types.map((t) => [t.id, t]));

    const effectiveMonths =
      months.length === 0 ? Array.from({ length: 12 }, (_, i) => i + 1) : months;

    const monthBucketsToman = new Map<string, bigint>();
    const monthBucketsUsd = new Map<string, bigint>();
    const yearBucketsToman = new Map<string, bigint>();
    const yearBucketsUsd = new Map<string, bigint>();

    for (const e of chartExpenses) {
      const jalali = dayjs(e.factorDate).calendar("jalali");
      const monthNum = jalali.month() + 1;
      const yearNum = jalali.year();
      const amount = BigInt(e.amount.toString());

      if (chartMode === "months") {
        if (!effectiveMonths.includes(monthNum)) continue;
        const key = jalali.format("YYYY/MM");
        if (e.currency === "TOMAN") {
          monthBucketsToman.set(key, (monthBucketsToman.get(key) ?? BigInt(0)) + amount);
        } else {
          monthBucketsUsd.set(key, (monthBucketsUsd.get(key) ?? BigInt(0)) + amount);
        }
      } else {
        if (!effectiveMonths.includes(monthNum)) continue;
        const key = String(yearNum);
        if (e.currency === "TOMAN") {
          yearBucketsToman.set(key, (yearBucketsToman.get(key) ?? BigInt(0)) + amount);
        } else {
          yearBucketsUsd.set(key, (yearBucketsUsd.get(key) ?? BigInt(0)) + amount);
        }
      }
    }

    const financierTotalsMap = new Map<
      string,
      { userId: string; userName: string; totalAmount: bigint; paidAmount: bigint; unpaidAmount: bigint }
    >();
    const financierBalancesMap = new Map<
      string,
      { userId: string; userName: string; owedToMe: bigint; iOwe: bigint }
    >();

    const ensureBalance = (userId: string, userName: string) => {
      const prev = financierBalancesMap.get(userId) ?? {
        userId,
        userName,
        owedToMe: BigInt(0),
        iOwe: BigInt(0),
      };
      financierBalancesMap.set(userId, prev);
      return prev;
    };

    for (const row of financierShareRows) {
      const prev = financierTotalsMap.get(row.userId) ?? {
        userId: row.userId,
        userName: row.user.fullName,
        totalAmount: BigInt(0),
        paidAmount: BigInt(0),
        unpaidAmount: BigInt(0),
      };
      const amount = BigInt(row.amount.toString());
      const settled = sumSettledOnShare(
        row.payments.map((payment) => ({
          amount: payment.amount.toString(),
          kind: payment.kind,
        })),
      );
      const unpaid = settled >= amount ? BigInt(0) : amount - settled;
      prev.totalAmount += amount;
      prev.paidAmount += settled;
      prev.unpaidAmount += unpaid;
      financierTotalsMap.set(row.userId, prev);

      if (unpaid > BigInt(0)) {
        const debtor = ensureBalance(row.userId, row.user.fullName);
        debtor.iOwe += unpaid;
        if (row.creditorUserId && row.creditor) {
          const creditor = ensureBalance(row.creditorUserId, row.creditor.fullName);
          creditor.owedToMe += unpaid;
        }
      }
    }

    const periodAmountToman = periodTotals.TOMAN.toString();
    const periodAmountUsd = periodTotals.USD.toString();

    const stats: DashboardStats = {
      totalAmountToman: allTotals.TOMAN.toString(),
      totalAmountUsd: allTotals.USD.toString(),
      monthAmountToman: periodAmountToman,
      monthAmountUsd: periodAmountUsd,
      periodAmountToman,
      periodAmountUsd,
      expenseCount: countAll,
      monthExpenseCount: countPeriod,
      periodExpenseCount: countPeriod,
      chartMode,
      byType: byType.map((b) => {
        const type = typeMap[b.costFactorTypeId];
        return {
          typeId: b.costFactorTypeId,
          name: type?.name ?? "نامشخص",
          color: type?.color ?? "#059669",
          amount: (b._sum.amount ?? 0).toString(),
          currency: b.currency,
        };
      }),
      byMonthToman: Array.from(monthBucketsToman.entries()).map(([month, amount]) => ({
        month,
        amount: amount.toString(),
      })),
      byMonthUsd: Array.from(monthBucketsUsd.entries()).map(([month, amount]) => ({
        month,
        amount: amount.toString(),
      })),
      byYearToman: jalaliYearOptions(minJalaliYear, maxJalaliYear).map((year) => ({
        year: String(year),
        amount: (yearBucketsToman.get(String(year)) ?? BigInt(0)).toString(),
      })),
      byYearUsd: jalaliYearOptions(minJalaliYear, maxJalaliYear).map((year) => ({
        year: String(year),
        amount: (yearBucketsUsd.get(String(year)) ?? BigInt(0)).toString(),
      })),
      financierTotals: Array.from(financierTotalsMap.values())
        .sort((a, b) => a.userName.localeCompare(b.userName))
        .map((item) => ({
          userId: item.userId,
          userName: item.userName,
          totalAmount: item.totalAmount.toString(),
          paidAmount: item.paidAmount.toString(),
          unpaidAmount: item.unpaidAmount.toString(),
        })),
      financierBalances: Array.from(financierBalancesMap.values())
        .filter((item) => item.owedToMe > BigInt(0) || item.iOwe > BigInt(0))
        .sort((a, b) => a.userName.localeCompare(b.userName))
        .map((item) => ({
          userId: item.userId,
          userName: item.userName,
          owedToMe: item.owedToMe.toString(),
          iOwe: item.iOwe.toString(),
        })),
    };

    return Response.json(stats);
  } catch (error) {
    return jsonError(error);
  }
}
