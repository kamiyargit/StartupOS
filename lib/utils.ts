import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { formatCurrencyAmount } from "@/lib/currency";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** @deprecated Use formatCurrencyAmount or formatExpenseMoney from @/lib/currency */
export function formatToman(amount: number | string | bigint): string {
  return formatCurrencyAmount(amount);
}
