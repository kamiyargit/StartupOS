"use client";

import DatePicker from "react-multi-date-picker";
import type { CustomComponentProps } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";
import gregorian_en from "react-date-object/locales/gregorian_en";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { minGregorianDateFromJalaliYear } from "@/lib/dates";
import { useAppSettings } from "@/components/app-settings-provider";
import "react-multi-date-picker/styles/colors/green.css";
import "./dual-date-picker.css";

const dateInputClassName =
  "cursor-pointer text-start tabular-nums [color-scheme:light] dark:[color-scheme:dark]";

type DatePickerInputProps = CustomComponentProps & {
  placeholder?: string;
};

function DatePickerInput({
  value,
  openCalendar,
  handleValueChange,
  onFocus,
  placeholder,
}: DatePickerInputProps) {
  return (
    <Input
      value={value ?? ""}
      onChange={(e) => handleValueChange?.(e)}
      onFocus={() => {
        openCalendar?.();
        onFocus?.();
      }}
      placeholder={placeholder}
      dir="ltr"
      className={dateInputClassName}
      inputMode="numeric"
      autoComplete="off"
    />
  );
}

type DualDatePickerProps = {
  value: Date | null;
  onChange: (date: Date) => void;
  className?: string;
};

const pickerClassName = "rmdp-wrapper green w-full";

export function DualDatePicker({ value, onChange, className }: DualDatePickerProps) {
  const { minJalaliYear } = useAppSettings();
  const minDate = minGregorianDateFromJalaliYear(minJalaliYear);

  const handlePickerChange = (d: { toDate: () => Date } | null) => {
    if (!d) return;
    const date = d.toDate();
    if (Number.isNaN(date.getTime())) return;
    onChange(date);
  };

  return (
    <div className={cn("dual-date-picker grid gap-4 sm:grid-cols-2", className)}>
      <div className="space-y-2">
        <Label>تاریخ شمسی</Label>
        <DatePicker
          calendar={persian}
          locale={persian_fa}
          value={value ?? undefined}
          onChange={handlePickerChange}
          minDate={minDate}
          className={cn(pickerClassName, "rmdp-rtl")}
          containerClassName="w-full"
          calendarPosition="bottom-start"
          render={<DatePickerInput placeholder="۱۴۰۳/۰۱/۰۱" />}
        />
      </div>
      <div className="space-y-2">
        <Label>تاریخ میلادی</Label>
        <DatePicker
          calendar={gregorian}
          locale={gregorian_en}
          format="YYYY-MM-DD"
          value={value ?? undefined}
          onChange={handlePickerChange}
          minDate={minDate}
          className={cn(pickerClassName, "rmdp-ltr")}
          containerClassName="w-full"
          calendarPosition="bottom-start"
          render={<DatePickerInput placeholder="2024-01-01" />}
        />
      </div>
    </div>
  );
}
