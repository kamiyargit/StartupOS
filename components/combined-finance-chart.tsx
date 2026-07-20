"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrencyAmount, formatExpenseMoney } from "@/lib/currency";

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => {
      const { width, height } = element.getBoundingClientRect();
      setSize({ width: Math.round(width), height: Math.round(height) });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width: size.width, height: size.height };
}

export type CombinedBarDatum = {
  label: string;
  tickLabel: string;
  sortKey: string;
  income: number;
  expense: number;
};

type ChartColors = {
  tick: string;
  grid: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  tooltipMuted: string;
  legendText: string;
};

type CombinedFinanceChartProps = {
  data: CombinedBarDatum[];
  currency: "TOMAN" | "USD";
  theme: "light" | "dark";
  colors: ChartColors;
  isMobile: boolean;
  incomeFill: string;
  expenseFill: string;
};

function CombinedChartTooltip({
  active,
  payload,
  theme,
  currency,
  colors,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ dataKey?: string; value?: number; payload?: CombinedBarDatum }>;
  theme: "light" | "dark";
  currency: "TOMAN" | "USD";
  colors: ChartColors;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  const income = Number(item?.income ?? 0);
  const expense = Number(item?.expense ?? 0);

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
      <p className="mb-2 text-xs" style={{ color: colors.tooltipMuted }}>
        {item?.label}
      </p>
      <p className="text-sm tabular-nums" dir="ltr" style={{ textAlign: "end" }}>
        درآمد: {formatExpenseMoney(income, currency)}
      </p>
      <p className="text-sm tabular-nums" dir="ltr" style={{ textAlign: "end" }}>
        هزینه: {formatExpenseMoney(expense, currency)}
      </p>
    </div>
  );
}

function RtlLegend({ payload, textColor }: { payload?: ReadonlyArray<{ value?: string; color?: string }>; textColor: string }) {
  if (!payload?.length) return null;
  return (
    <ul dir="rtl" className="flex flex-wrap justify-center gap-x-4 gap-y-2 pt-3 text-xs" style={{ color: textColor }}>
      {payload.map((entry) => (
        <li key={entry.value ?? ""} className="flex flex-row-reverse items-center gap-2">
          <span>{entry.value}</span>
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
        </li>
      ))}
    </ul>
  );
}

function MobileCombinedChart({
  data,
  currency,
  incomeFill,
  expenseFill,
}: {
  data: CombinedBarDatum[];
  currency: "TOMAN" | "USD";
  incomeFill: string;
  expenseFill: string;
}) {
  const maxAmount = useMemo(
    () => Math.max(...data.flatMap((item) => [item.income, item.expense]), 1),
    [data],
  );

  return (
    <div dir="rtl" className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto px-2 pb-2">
      {data.map((item) => (
        <div key={item.sortKey} className="space-y-1.5">
          <p className="text-[11px] font-medium text-slate-600 dark:text-gh-fg-muted">{item.tickLabel}</p>
          {[
            { key: "income", label: "درآمد", value: item.income, fill: incomeFill },
            { key: "expense", label: "هزینه", value: item.expense, fill: expenseFill },
          ].map((row) => {
            const widthPct = row.value > 0 ? Math.max((row.value / maxAmount) * 100, 18) : 0;
            return (
              <div key={row.key} className="grid grid-cols-[4rem_1fr] items-center gap-2">
                <span className="text-[10px] text-slate-500">{row.label}</span>
                <div className="relative h-5 overflow-hidden rounded-md bg-slate-100 dark:bg-gh-neutral">
                  {row.value > 0 ? (
                    <div
                      className="absolute inset-y-0 end-0 flex items-center justify-end rounded-md px-1.5"
                      style={{ width: `${widthPct}%`, backgroundColor: row.fill }}
                    >
                      <span className="truncate text-[9px] font-semibold text-white" dir="rtl">
                        {formatExpenseMoney(row.value, currency)}
                      </span>
                    </div>
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-400">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function DesktopCombinedChart({
  data,
  currency,
  theme,
  colors,
  incomeFill,
  expenseFill,
}: {
  data: CombinedBarDatum[];
  currency: "TOMAN" | "USD";
  theme: "light" | "dark";
  colors: ChartColors;
  incomeFill: string;
  expenseFill: string;
}) {
  const { ref, width, height } = useElementSize<HTMLDivElement>();

  return (
    <div ref={ref} className="h-full w-full min-h-[260px]" style={{ direction: "ltr" }}>
      {width > 0 && height > 0 ? (
        <BarChart width={width} height={height} data={data} margin={{ top: 8, right: 8, left: 8, bottom: 28 }} barGap={4} barCategoryGap="12%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
          <XAxis
            dataKey="tickLabel"
            reversed
            angle={-35}
            textAnchor="end"
            interval={0}
            tick={{ fill: colors.tick, fontSize: 11, fontFamily: "var(--font-vazirmatn), sans-serif" }}
            axisLine={{ stroke: colors.grid }}
            tickLine={{ stroke: colors.grid }}
            height={40}
            tickMargin={4}
          />
          <YAxis
            tick={{ fill: colors.tick, fontSize: 11, fontFamily: "var(--font-vazirmatn), sans-serif" }}
            tickFormatter={(value) => {
              const n = Number(value);
              if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
              if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
              return formatCurrencyAmount(n);
            }}
            axisLine={{ stroke: colors.grid }}
            tickLine={{ stroke: colors.grid }}
            width={56}
            orientation="right"
          />
          <Tooltip
            content={<CombinedChartTooltip theme={theme} currency={currency} colors={colors} />}
            cursor={{ fill: theme === "dark" ? "rgba(48, 54, 61, 0.55)" : "rgba(15, 23, 42, 0.06)" }}
            wrapperStyle={{ outline: "none" }}
          />
          <Legend content={(props) => <RtlLegend payload={props.payload} textColor={colors.legendText} />} />
          <Bar dataKey="income" name="درآمد" fill={incomeFill} radius={[4, 4, 0, 0]} maxBarSize={40} />
          <Bar dataKey="expense" name="هزینه" fill={expenseFill} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      ) : null}
    </div>
  );
}

export function CombinedFinanceChart({
  data,
  currency,
  theme,
  colors,
  isMobile,
  incomeFill,
  expenseFill,
}: CombinedFinanceChartProps) {
  if (isMobile) {
    return <MobileCombinedChart data={data} currency={currency} incomeFill={incomeFill} expenseFill={expenseFill} />;
  }

  return (
    <DesktopCombinedChart
      data={data}
      currency={currency}
      theme={theme}
      colors={colors}
      incomeFill={incomeFill}
      expenseFill={expenseFill}
    />
  );
}

export function mergeFinanceBarData(
  expenseRows: { sortKey: string; label: string; tickLabel: string; amount: number }[],
  incomeRows: { sortKey: string; label: string; tickLabel: string; amount: number }[],
): CombinedBarDatum[] {
  const keys = new Set([...expenseRows.map((r) => r.sortKey), ...incomeRows.map((r) => r.sortKey)]);
  const expenseMap = new Map(expenseRows.map((r) => [r.sortKey, r]));
  const incomeMap = new Map(incomeRows.map((r) => [r.sortKey, r]));

  return [...keys]
    .sort()
    .map((sortKey) => {
      const expense = expenseMap.get(sortKey);
      const income = incomeMap.get(sortKey);
      return {
        sortKey,
        label: expense?.label ?? income?.label ?? sortKey,
        tickLabel: expense?.tickLabel ?? income?.tickLabel ?? sortKey,
        expense: expense?.amount ?? 0,
        income: income?.amount ?? 0,
      };
    });
}
