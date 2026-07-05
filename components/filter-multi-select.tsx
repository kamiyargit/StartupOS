"use client";

import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type FilterMultiSelectOption = {
  value: string;
  label: string;
  dotColor?: string;
};

type FilterMultiSelectProps = {
  label: string;
  options: FilterMultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  emptyLabel?: string;
  showSelectAll?: boolean;
  selectAllLabel?: string;
  clearLabel?: string;
};

export function FilterMultiSelect({
  label,
  options,
  value,
  onChange,
  emptyLabel = "همه",
  showSelectAll = false,
  selectAllLabel = "انتخاب همه",
  clearLabel = "پاک کردن",
}: FilterMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const optionMap = new Map(options.map((o) => [o.value, o.label]));

  const triggerLabel =
    value.length === 0
      ? emptyLabel
      : value.length === 1
        ? (optionMap.get(value[0]) ?? `${value.length} مورد`)
        : `${value.length} مورد انتخاب شده`;

  const toggle = (optionValue: string) => {
    const exists = value.includes(optionValue);
    onChange(
      exists ? value.filter((v) => v !== optionValue) : [...value, optionValue],
    );
  };

  const selectAll = () => onChange(options.map((o) => o.value));
  const clearAll = () => onChange([]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full justify-between font-normal"
            aria-label={label}
          >
            <span
              className={cn(
                "truncate",
                value.length === 0 && "text-slate-500 dark:text-gh-fg-muted",
              )}
            >
              {triggerLabel}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={4}
            className="z-50 w-[var(--radix-popover-trigger-width)] max-h-80 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md dark:border-gh-border dark:bg-gh-canvas-subtle"
          >
            {showSelectAll && (
              <div className="flex gap-1 border-b border-slate-200 p-2 dark:border-gh-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 flex-1 text-xs"
                  onClick={selectAll}
                >
                  {selectAllLabel}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 flex-1 text-xs"
                  onClick={clearAll}
                >
                  {clearLabel}
                </Button>
              </div>
            )}
            <div className="max-h-64 overflow-y-auto p-2">
              {options.length === 0 ? (
                <p className="px-2 py-3 text-sm text-slate-500 dark:text-gh-fg-muted">
                  موردی یافت نشد.
                </p>
              ) : (
                options.map((option) => {
                  const checked = value.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggle(option.value)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-2 text-start text-sm transition",
                        checked
                          ? "bg-emerald-50 text-emerald-800 dark:bg-[#033a16] dark:text-gh-success"
                          : "hover:bg-slate-100 dark:hover:bg-gh-neutral",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                          checked
                            ? "border-emerald-600 bg-emerald-600 text-white dark:border-gh-success dark:bg-gh-success"
                            : "border-slate-300 dark:border-gh-border",
                        )}
                      >
                        {checked && <Check className="h-3 w-3" />}
                      </span>
                      {option.dotColor && (
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: option.dotColor }}
                        />
                      )}
                      <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    </button>
                  );
                })
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((itemValue) => (
            <span
              key={itemValue}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs dark:bg-gh-neutral"
            >
              {optionMap.get(itemValue) ?? itemValue}
              <button
                type="button"
                onClick={() => toggle(itemValue)}
                className="rounded-full p-0.5 hover:bg-slate-200 dark:hover:bg-gh-neutral-emphasis"
                aria-label="حذف"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
