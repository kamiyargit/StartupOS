import { Currency } from "@prisma/client";

export type ExpenseCurrency = Currency;

export const CURRENCY_OPTIONS: { value: ExpenseCurrency; label: string }[] = [
  { value: "TOMAN", label: "تومان" },
  { value: "USD", label: "$" },
];

export function currencySymbol(currency: ExpenseCurrency): string {
  return currency === "USD" ? "$" : "تومان";
}

/** Formats integer amounts with dot thousands separators, e.g. 150000 → "150.000" */
export function formatCurrencyAmount(amount: number | string | bigint): string {
  const digits = String(amount).replace(/\D/g, "");
  if (!digits) return "0";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function parseCurrencyAmount(input: string): string {
  return input.replace(/\D/g, "");
}

export function formatExpenseMoney(
  amount: number | string | bigint,
  currency: ExpenseCurrency,
): string {
  return `${formatCurrencyAmount(amount)} ${currencySymbol(currency)}`;
}
