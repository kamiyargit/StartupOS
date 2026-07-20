"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterMultiSelect } from "@/components/filter-multi-select";
import { CombinedFinanceChart, mergeFinanceBarData } from "@/components/combined-finance-chart";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrencyAmount, formatExpenseMoney, currencySymbol } from "@/lib/currency";
import { DashboardStats } from "@/lib/dto";
import { CostFactorTypeDTO, UserDTO } from "@/lib/dto";
import { currentJalaliMonth, jalaliYearOptions, type JalaliYearScope } from "@/lib/dates";
import { useAppSettings } from "@/components/app-settings-provider";
import { useTheme } from "@/components/theme-provider";

const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

function formatJalaliMonthLabel(key: string): string {
  const [year, month] = key.split("/");
  const monthName = JALALI_MONTHS[Number(month) - 1] ?? month;
  return `${monthName} ${year}`;
}

/** Recharts measures layout in LTR; isolate charts from page RTL. */
const chartLtrStyle = { direction: "ltr" as const };

function getChartColors(theme: "light" | "dark") {
  const isDark = theme === "dark";
  return {
    tick: isDark ? "#8b949e" : "#64748b",
    tickEmphasis: isDark ? "#e6edf3" : "#0f172a",
    grid: isDark ? "#21262d" : "#e2e8f0",
    pieStroke: isDark ? "#161b22" : "#ffffff",
    barFill: isDark ? "#7F77DD" : "#534AB7",
    barFillUsd: isDark ? "#1f6feb" : "#2563eb",
    legendText: isDark ? "#c9d1d9" : "#475569",
    tooltipBg: isDark ? "#161b22" : "#ffffff",
    tooltipBorder: isDark ? "#30363d" : "#e2e8f0",
    tooltipText: isDark ? "#e6edf3" : "#0f172a",
    tooltipMuted: isDark ? "#8b949e" : "#64748b",
  };
}

function PieChartTooltip({
  active,
  payload,
  theme,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: number; payload?: { currency?: "TOMAN" | "USD" } }>;
  theme: "light" | "dark";
}) {
  if (!active || !payload?.length) return null;

  const colors = getChartColors(theme);
  const item = payload[0];
  const currency = item?.payload?.currency ?? "TOMAN";

  return (
    <div
      dir="rtl"
      className="rounded-lg border px-3 py-2 shadow-lg"
      style={{
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        color: colors.tooltipText,
        boxShadow:
          theme === "dark" ? "0 8px 24px rgb(0 0 0 / 0.45)" : "0 4px 12px rgb(0 0 0 / 0.08)",
      }}
    >
      <p className="font-semibold tabular-nums" dir="ltr" style={{ textAlign: "end" }}>
        {formatExpenseMoney(Number(item?.value ?? 0), currency)}
      </p>
    </div>
  );
}

function RtlPieLegend({
  payload,
  textColor = "#475569",
}: {
  payload?: ReadonlyArray<{ value?: string; color?: string }>;
  textColor?: string;
}) {
  if (!payload?.length) return null;
  return (
    <ul
      dir="rtl"
      className="flex flex-wrap justify-center gap-x-4 gap-y-2 pt-3"
      style={{ fontFamily: "var(--font-vazirmatn), sans-serif", fontSize: 12 }}
    >
      {payload.map((entry) => (
        <li key={entry.value ?? ""} className="flex flex-row-reverse items-center gap-2">
          <span className="text-xs" style={{ color: textColor }}>
            {entry.value}
          </span>
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
        </li>
      ))}
    </ul>
  );
}

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}

function formatPeriodLabel(yearScope: JalaliYearScope, selectedMonths: number[]): string {
  const monthPart =
    selectedMonths.length === 0
      ? "کل سال"
      : selectedMonths.map((m) => JALALI_MONTHS[m - 1]).join("، ");
  if (yearScope === "all") {
    return `همه سال‌ها · ${monthPart}`;
  }
  return `${yearScope} · ${monthPart}`;
}

function buildBarDataByMonth(
  rows: { month: string; amount: string }[] | undefined,
  year: number,
  selectedMonths: number[],
) {
  const amounts = new Map<string, number>();
  for (const row of rows ?? []) {
    amounts.set(row.month, Number(row.amount));
  }

  const monthsToShow =
    selectedMonths.length === 0
      ? Array.from({ length: 12 }, (_, i) => i + 1)
      : [...selectedMonths].sort((a, b) => a - b);

  return monthsToShow.map((month) => {
    const paddedKey = `${year}/${String(month).padStart(2, "0")}`;
    const plainKey = `${year}/${month}`;
    const amount = amounts.get(paddedKey) ?? amounts.get(plainKey) ?? 0;

    return {
      label: formatJalaliMonthLabel(paddedKey),
      tickLabel: JALALI_MONTHS[month - 1] ?? String(month),
      sortKey: paddedKey,
      amount,
    };
  });
}

function buildBarDataByYear(
  rows: { year: string; amount: string }[] | undefined,
  minYear: number,
  maxYear: number,
) {
  const amounts = new Map<string, number>();
  for (const row of rows ?? []) {
    amounts.set(row.year, Number(row.amount));
  }

  return jalaliYearOptions(minYear, maxYear).map((year) => ({
    label: String(year),
    tickLabel: String(year),
    sortKey: String(year),
    amount: amounts.get(String(year)) ?? 0,
  }));
}

export function AnalyticsDashboard() {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const chartColors = getChartColors(theme);
  const { minJalaliYear, loading: settingsLoading } = useAppSettings();
  const now = currentJalaliMonth();
  const [yearScope, setYearScope] = useState<JalaliYearScope>("all");
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string>("all");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [types, setTypes] = useState<CostFactorTypeDTO[]>([]);
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [monthlyCurrency, setMonthlyCurrency] = useState<"TOMAN" | "USD">("TOMAN");
  const [shareModal, setShareModal] = useState<DashboardStats["financierTotals"][number] | null>(null);
  const [balanceModal, setBalanceModal] = useState<DashboardStats["financierBalances"][number] | null>(null);

  const monthOptions = JALALI_MONTHS.map((name, index) => ({
    value: String(index + 1),
    label: name,
  }));

  const typeOptions = types
    .filter((t) => t.isActive)
    .map((t) => ({ value: t.id, label: t.name, dotColor: t.color }));

  useEffect(() => {
    Promise.all([fetch("/api/cost-types"), fetch("/api/users?all=true")]).then(async ([t, u]) => {
      setTypes(await t.json());
      setUsers(await u.json());
    });
  }, []);

  useEffect(() => {
    if (settingsLoading) return;
    if (typeof yearScope === "number" && yearScope < minJalaliYear) {
      setYearScope(minJalaliYear);
    }
  }, [settingsLoading, minJalaliYear, yearScope]);

  const yearOptions = jalaliYearOptions(minJalaliYear, now.year + 1);
  const periodLabel = formatPeriodLabel(yearScope, selectedMonths);
  const chartMode = stats?.chartMode ?? (yearScope === "all" ? "years" : "months");

  useEffect(() => {
    const params = new URLSearchParams({
      jy: yearScope === "all" ? "all" : String(yearScope),
    });
    if (selectedMonths.length > 0) {
      params.set("months", selectedMonths.join(","));
    }
    if (selectedTypeIds.length > 0) {
      params.set("typeIds", selectedTypeIds.join(","));
    }
    if (userId !== "all") params.set("userId", userId);
    fetch(`/api/dashboard/stats?${params}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || !Array.isArray(data.byType)) {
          setStats(null);
          return;
        }
        setStats(data as DashboardStats);
      })
      .catch(() => setStats(null));
  }, [yearScope, selectedMonths, selectedTypeIds, userId]);

  const pieData =
    stats?.byType
      ?.filter((t) => Number(t.amount) > 0)
      .map((t) => ({
        name: t.name,
        label: `${t.name} (${currencySymbol(t.currency)})`,
        value: Number(t.amount),
        currency: t.currency,
        color: t.color,
      })) ?? [];

  const incomePieData =
    stats?.byIncomeCategory
      ?.filter((t) => t.currency === monthlyCurrency && Number(t.amount) > 0)
      .map((t) => ({
        name: t.name,
        label: `${t.name} (${currencySymbol(t.currency)})`,
        value: Number(t.amount),
        currency: t.currency,
        color: t.color,
      })) ?? [];

  const barDataToman =
    chartMode === "years"
      ? buildBarDataByYear(stats?.byYearToman, minJalaliYear, now.year + 1)
      : buildBarDataByMonth(stats?.byMonthToman, yearScope as number, selectedMonths);
  const barDataUsd =
    chartMode === "years"
      ? buildBarDataByYear(stats?.byYearUsd, minJalaliYear, now.year + 1)
      : buildBarDataByMonth(stats?.byMonthUsd, yearScope as number, selectedMonths);
  const incomeBarDataToman =
    chartMode === "years"
      ? buildBarDataByYear(stats?.byYearIncomeToman, minJalaliYear, now.year + 1)
      : buildBarDataByMonth(stats?.byMonthIncomeToman, yearScope as number, selectedMonths);
  const incomeBarDataUsd =
    chartMode === "years"
      ? buildBarDataByYear(stats?.byYearIncomeUsd, minJalaliYear, now.year + 1)
      : buildBarDataByMonth(stats?.byMonthIncomeUsd, yearScope as number, selectedMonths);
  const expenseBarData = monthlyCurrency === "TOMAN" ? barDataToman : barDataUsd;
  const incomeBarData = monthlyCurrency === "TOMAN" ? incomeBarDataToman : incomeBarDataUsd;
  const combinedBarData = mergeFinanceBarData(expenseBarData, incomeBarData);
  const hasCombinedChartData = combinedBarData.some((item) => item.income > 0 || item.expense > 0);
  const chartTitle = chartMode === "years" ? "درآمد و هزینه سالانه" : "درآمد و هزینه ماهانه";

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-gh-fg sm:text-2xl">تحلیل مالی</h1>
        <p className="text-sm text-slate-500 dark:text-gh-fg-muted">نمودارها، آمار و وضعیت تامین‌کنندگان</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">فیلترها</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>سال</Label>
            <Select
              value={yearScope === "all" ? "all" : String(yearScope)}
              onValueChange={(v) => setYearScope(v === "all" ? "all" : Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه سال‌ها</SelectItem>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <FilterMultiSelect
            label="ماه"
            options={monthOptions}
            value={selectedMonths.map(String)}
            onChange={(values) =>
              setSelectedMonths(values.map(Number).sort((a, b) => a - b))
            }
            emptyLabel="همه ماه‌ها"
            showSelectAll
            selectAllLabel="کل سال"
            clearLabel="پاک کردن"
          />
          <FilterMultiSelect
            label="نوع هزینه"
            options={typeOptions}
            value={selectedTypeIds}
            onChange={setSelectedTypeIds}
            emptyLabel="همه انواع"
          />
          <div className="space-y-2">
            <Label>ثبت‌کننده</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="همه" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-gh-fg-muted">درآمد بازه</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400" dir="ltr">
              {formatExpenseMoney(stats?.periodIncomeToman ?? 0, "TOMAN")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-gh-fg-muted">سود/زیان (تومان)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary-700 dark:text-primary-400" dir="ltr">
              {formatExpenseMoney(stats?.profitLossToman ?? 0, "TOMAN")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-gh-fg-muted">مجموع کل</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-bold" dir="ltr">
              {formatExpenseMoney(stats?.totalAmountToman ?? 0, "TOMAN")}
            </p>
            {Number(stats?.totalAmountUsd ?? 0) > 0 && (
              <p className="text-lg font-semibold text-slate-600 dark:text-gh-fg-emphasis" dir="ltr">
                {formatExpenseMoney(stats?.totalAmountUsd ?? 0, "USD")}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-gh-fg-muted">
              بازه انتخاب‌شده
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-bold text-primary-700 dark:text-primary-400" dir="ltr">
              {formatExpenseMoney(stats?.periodAmountToman ?? 0, "TOMAN")}
            </p>
            {Number(stats?.periodAmountUsd ?? 0) > 0 && (
              <p className="text-lg font-semibold text-primary-600 dark:text-primary-400" dir="ltr">
                {formatExpenseMoney(stats?.periodAmountUsd ?? 0, "USD")}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-gh-fg-muted">تعداد فاکتور (کل)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.expenseCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-gh-fg-muted">
              فاکتور بازه انتخاب‌شده
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.periodExpenseCount ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">وضعیت سهم تامین‌کنندگان ({periodLabel})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!stats?.financierTotals?.length ? (
            <p className="text-sm text-slate-500 dark:text-gh-fg-muted">اطلاعاتی وجود ندارد.</p>
          ) : (
            stats.financierTotals.map((item) => (
              <button
                key={item.userId}
                type="button"
                onClick={() => setShareModal(item)}
                className="flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-start text-sm transition hover:border-primary-400 hover:bg-primary-50/50 dark:border-gh-border dark:hover:border-primary-600 dark:hover:bg-primary-950/20"
              >
                <span className="font-medium">{item.userName}</span>
                <div className="flex items-center gap-3 text-xs sm:text-sm">
                  <span className="text-primary-600 dark:text-primary-400" dir="ltr">
                    پرداخت: {formatCurrencyAmount(item.paidAmount)}
                  </span>
                  <span className="text-amber-600 dark:text-amber-400" dir="ltr">
                    باقیمانده: {formatCurrencyAmount(item.unpaidAmount)}
                  </span>
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">تسویه بین تامین‌کنندگان ({periodLabel})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!stats?.financierBalances?.length ? (
            <p className="text-sm text-slate-500 dark:text-gh-fg-muted">بدهی بین تامین‌کنندگان ثبت نشده است.</p>
          ) : (
            stats.financierBalances.map((item) => (
              <button
                key={item.userId}
                type="button"
                onClick={() => setBalanceModal(item)}
                className="flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-start text-sm transition hover:border-primary-400 hover:bg-primary-50/50 dark:border-gh-border dark:hover:border-primary-600 dark:hover:bg-primary-950/20"
              >
                <span className="font-medium">{item.userName}</span>
                <div className="flex items-center gap-3 text-xs sm:text-sm">
                  <span className="text-primary-600 dark:text-primary-400" dir="ltr">
                    طلب: {formatCurrencyAmount(item.owedToMe)}
                  </span>
                  <span className="text-amber-600 dark:text-amber-400" dir="ltr">
                    بدهی: {formatCurrencyAmount(item.iOwe)}
                  </span>
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <Card className="min-w-0 overflow-hidden lg:col-span-2">
          <CardHeader className="space-y-3">
            <CardTitle className="text-base">{chartTitle}</CardTitle>
            <div
              role="tablist"
              aria-label={`واحد نمودار ${chartTitle}`}
              className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-gh-border dark:bg-gh-canvas-inset"
            >
              <button
                type="button"
                role="tab"
                aria-selected={monthlyCurrency === "TOMAN"}
                onClick={() => setMonthlyCurrency("TOMAN")}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  monthlyCurrency === "TOMAN"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-gh-canvas-subtle dark:text-gh-fg"
                    : "text-slate-500 hover:text-slate-700 dark:text-gh-fg-muted dark:hover:text-gh-fg"
                }`}
              >
                {chartMode === "years" ? "سالانه (تومان)" : "ماهانه (تومان)"}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={monthlyCurrency === "USD"}
                onClick={() => setMonthlyCurrency("USD")}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  monthlyCurrency === "USD"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-gh-canvas-subtle dark:text-gh-fg"
                    : "text-slate-500 hover:text-slate-700 dark:text-gh-fg-muted dark:hover:text-gh-fg"
                }`}
              >
                {chartMode === "years" ? "سالانه ($)" : "ماهانه ($)"}
              </button>
            </div>
          </CardHeader>
          <CardContent
            className={
              isMobile
                ? "h-80 min-w-0 overflow-hidden px-1 py-2"
                : "h-72 min-w-0 overflow-hidden sm:h-80"
            }
          >
            {!hasCombinedChartData ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-gh-fg-muted">
                داده‌ای برای نمایش وجود ندارد
              </div>
            ) : (
              <CombinedFinanceChart
                data={combinedBarData}
                currency={monthlyCurrency}
                theme={theme}
                colors={chartColors}
                isMobile={isMobile}
                incomeFill={chartColors.barFillUsd}
                expenseFill={monthlyCurrency === "TOMAN" ? chartColors.barFill : chartColors.barFillUsd}
              />
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">بر اساس نوع هزینه ({periodLabel})</CardTitle>
          </CardHeader>
          <CardContent className="h-80 min-w-0 overflow-hidden">
            {pieData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-gh-fg-muted">
                داده‌ای برای نمایش وجود ندارد
              </div>
            ) : (
              <div className="h-full w-full" style={chartLtrStyle}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={78}
                      paddingAngle={2}
                    >
                      {pieData.map((entry) => (
                        <Cell
                          key={`${entry.name}-${entry.currency}`}
                          fill={entry.color}
                          stroke={chartColors.pieStroke}
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Legend
                      content={(props) => (
                        <RtlPieLegend payload={props.payload} textColor={chartColors.legendText} />
                      )}
                    />
                    <Tooltip
                      content={<PieChartTooltip theme={theme} />}
                      wrapperStyle={{ outline: "none" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">درآمد بر اساس دسته ({periodLabel})</CardTitle>
          </CardHeader>
          <CardContent className="h-80 min-w-0 overflow-hidden">
            {incomePieData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-gh-fg-muted">
                داده‌ای برای نمایش وجود ندارد
              </div>
            ) : (
              <div className="h-full w-full" style={chartLtrStyle}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={incomePieData}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={78}
                      paddingAngle={2}
                    >
                      {incomePieData.map((entry) => (
                        <Cell
                          key={`${entry.name}-${entry.currency}`}
                          fill={entry.color}
                          stroke={chartColors.pieStroke}
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Legend
                      content={(props) => (
                        <RtlPieLegend payload={props.payload} textColor={chartColors.legendText} />
                      )}
                    />
                    <Tooltip
                      content={<PieChartTooltip theme={theme} />}
                      wrapperStyle={{ outline: "none" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!shareModal} onOpenChange={(o) => !o && setShareModal(null)}>
        <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>جزئیات سهم تامین‌کننده</DialogTitle>
          </DialogHeader>
          {shareModal && (
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-500 dark:text-gh-fg-muted">نام</dt>
                <dd className="font-medium">{shareModal.userName}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-gh-fg-muted">بازه</dt>
                <dd>{periodLabel}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-gh-fg-muted">مجموع سهم</dt>
                <dd dir="ltr" className="font-semibold tabular-nums">
                  {formatCurrencyAmount(shareModal.totalAmount)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-gh-fg-muted">پرداخت‌شده</dt>
                <dd dir="ltr" className="font-semibold text-primary-600 tabular-nums dark:text-primary-400">
                  {formatCurrencyAmount(shareModal.paidAmount)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-gh-fg-muted">باقیمانده</dt>
                <dd dir="ltr" className="font-semibold text-amber-600 tabular-nums dark:text-amber-400">
                  {formatCurrencyAmount(shareModal.unpaidAmount)}
                </dd>
              </div>
            </dl>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!balanceModal} onOpenChange={(o) => !o && setBalanceModal(null)}>
        <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>جزئیات تسویه تامین‌کننده</DialogTitle>
          </DialogHeader>
          {balanceModal && (
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-500 dark:text-gh-fg-muted">نام</dt>
                <dd className="font-medium">{balanceModal.userName}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-gh-fg-muted">بازه</dt>
                <dd>{periodLabel}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-gh-fg-muted">طلب از دیگران</dt>
                <dd dir="ltr" className="font-semibold text-primary-600 tabular-nums dark:text-primary-400">
                  {formatCurrencyAmount(balanceModal.owedToMe)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-gh-fg-muted">بدهی به دیگران</dt>
                <dd dir="ltr" className="font-semibold text-amber-600 tabular-nums dark:text-amber-400">
                  {formatCurrencyAmount(balanceModal.iOwe)}
                </dd>
              </div>
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
