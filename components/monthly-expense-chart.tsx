"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
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
      setSize({
        width: Math.round(width),
        height: Math.round(height),
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width: size.width, height: size.height };
}

export type ExpenseBarDatum = {
  label: string;
  tickLabel: string;
  sortKey: string;
  amount: number;
};

/** @deprecated use ExpenseBarDatum */
export type MonthlyBarDatum = ExpenseBarDatum;

type ChartColors = {
  tick: string;
  grid: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  tooltipMuted: string;
};

type MonthlyExpenseChartProps = {
  data: ExpenseBarDatum[];
  currency: "TOMAN" | "USD";
  theme: "light" | "dark";
  barFill: string;
  colors: ChartColors;
  isMobile: boolean;
};

function MonthlyChartTooltip({
  active,
  payload,
  theme,
  currency,
  colors,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: number; payload?: ExpenseBarDatum }>;
  theme: "light" | "dark";
  currency: "TOMAN" | "USD";
  colors: ChartColors;
}) {
  if (!active || !payload?.length) return null;

  const item = payload[0]?.payload;
  const value = Number(payload[0]?.value ?? 0);
  const formatted =
    currency === "USD"
      ? `$ ${formatCurrencyAmount(value)}`
      : `${formatCurrencyAmount(value)} تومان`;

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
      <p className="mb-1 text-xs" style={{ color: colors.tooltipMuted }}>
        {item?.label}
      </p>
      <p className="font-semibold tabular-nums" dir="ltr" style={{ textAlign: "end" }}>
        {formatted}
      </p>
    </div>
  );
}

function MobileMonthlyChart({
  data,
  currency,
  barFill,
}: {
  data: ExpenseBarDatum[];
  currency: "TOMAN" | "USD";
  barFill: string;
}) {
  const maxAmount = useMemo(
    () => Math.max(...data.map((item) => item.amount), 1),
    [data],
  );

  return (
    <div dir="rtl" className="flex h-full min-h-0 flex-col gap-0.5 pb-2 px-4">
      {data.map((item) => {
        const widthPct = item.amount > 0 ? Math.max((item.amount / maxAmount) * 100, 18) : 0;
        const amountLabel = formatExpenseMoney(item.amount, currency);

        return (
          <div
            key={item.sortKey}
            className="grid min-h-0 flex-1 grid-cols-[5rem_1fr] items-center gap-2"
          >
            <span className="text-[11px] font-medium leading-tight text-slate-600 dark:text-gh-fg-muted">
              {item.tickLabel}
            </span>
            <div className="relative h-[1.35rem] overflow-hidden rounded-md bg-slate-100 dark:bg-gh-neutral sm:h-[1.5rem]">
              {item.amount > 0 ? (
                <div
                  className="absolute inset-y-0 end-0 flex items-center justify-end rounded-md px-1.5"
                  style={{ width: `${widthPct}%`, backgroundColor: barFill }}
                >
                  <span
                    className="truncate text-[9px] font-semibold tabular-nums text-white sm:text-[10px]"
                    dir="rtl"
                    style={{ textShadow: "0 1px 1px rgb(0 0 0 / 0.25)" }}
                  >
                    {amountLabel}
                  </span>
                </div>
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-400 dark:text-gh-fg-subtle">
                  —
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DesktopMonthlyChart({
  data,
  currency,
  theme,
  barFill,
  colors,
}: {
  data: ExpenseBarDatum[];
  currency: "TOMAN" | "USD";
  theme: "light" | "dark";
  barFill: string;
  colors: ChartColors;
}) {
  const { ref, width, height } = useElementSize<HTMLDivElement>();

  return (
    <div ref={ref} className="h-full w-full min-h-[260px]" style={{ direction: "ltr" }}>
      {width > 0 && height > 0 ? (
        <BarChart
          width={width}
          height={height}
          data={data}
          margin={{ top: 8, right: 8, left: 8, bottom: 28 }}
          barCategoryGap="10%"
          barGap={2}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
          <XAxis
            dataKey="tickLabel"
            reversed
            angle={-35}
            textAnchor="end"
            interval={0}
            tick={{
              fill: colors.tick,
              fontSize: 11,
              fontFamily: "var(--font-vazirmatn), sans-serif",
            }}
            axisLine={{ stroke: colors.grid }}
            tickLine={{ stroke: colors.grid }}
            height={40}
            tickMargin={4}
          />
          <YAxis
            tick={{
              fill: colors.tick,
              fontSize: 11,
              fontFamily: "var(--font-vazirmatn), sans-serif",
            }}
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
            content={<MonthlyChartTooltip theme={theme} currency={currency} colors={colors} />}
            cursor={{
              fill: theme === "dark" ? "rgba(48, 54, 61, 0.55)" : "rgba(15, 23, 42, 0.06)",
            }}
            wrapperStyle={{ outline: "none" }}
          />
          <Bar dataKey="amount" fill={barFill} radius={[4, 4, 0, 0]} maxBarSize={56} />
        </BarChart>
      ) : null}
    </div>
  );
}

export function MonthlyExpenseChart({
  data,
  currency,
  theme,
  barFill,
  colors,
  isMobile,
}: MonthlyExpenseChartProps) {
  if (isMobile) {
    return <MobileMonthlyChart data={data} currency={currency} barFill={barFill} />;
  }

  return (
    <DesktopMonthlyChart
      data={data}
      currency={currency}
      theme={theme}
      barFill={barFill}
      colors={colors}
    />
  );
}
