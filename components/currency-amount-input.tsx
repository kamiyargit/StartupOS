"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CURRENCY_OPTIONS,
  ExpenseCurrency,
  formatCurrencyAmount,
  parseCurrencyAmount,
} from "@/lib/currency";

type CurrencyAmountInputProps = {
  amount: string;
  currency: ExpenseCurrency;
  onAmountChange: (rawAmount: string) => void;
  onCurrencyChange: (currency: ExpenseCurrency) => void;
  id?: string;
  placeholder?: string;
};

export function CurrencyAmountInput({
  amount,
  currency,
  onAmountChange,
  onCurrencyChange,
  id,
  placeholder = "0",
}: CurrencyAmountInputProps) {
  return (
    <div className="flex gap-2">
      <Input
        id={id}
        inputMode="numeric"
        value={amount ? formatCurrencyAmount(amount) : ""}
        onChange={(e) => onAmountChange(parseCurrencyAmount(e.target.value))}
        dir="ltr"
        className="flex-1 text-start tabular-nums"
        placeholder={placeholder}
        autoComplete="off"
      />
      <Select
        value={currency}
        onValueChange={(value) => onCurrencyChange(value as ExpenseCurrency)}
      >
        <SelectTrigger className="w-[6.5rem] shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CURRENCY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
