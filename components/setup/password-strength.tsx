"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import {
  getPasswordStrength,
  type PasswordChecks,
} from "@/lib/setup/form-validation";

const CHECK_LABELS: { key: keyof PasswordChecks; label: string }[] = [
  { key: "minLength", label: "حداقل ۸ کاراکتر" },
  { key: "hasLower", label: "حداقل یک حرف کوچک (a-z)" },
  { key: "hasUpper", label: "حداقل یک حرف بزرگ (A-Z)" },
  { key: "hasNumber", label: "حداقل یک عدد (0-9)" },
  { key: "hasSpecial", label: "حداقل یک نماد (!@#$…)" },
];

const STRENGTH_BAR: Record<
  ReturnType<typeof getPasswordStrength>["score"],
  string
> = {
  0: "bg-red-500 dark:bg-red-400",
  1: "bg-orange-500 dark:bg-orange-400",
  2: "bg-amber-500 dark:bg-amber-400",
  3: "bg-lime-500 dark:bg-lime-400",
  4: "bg-emerald-500 dark:bg-emerald-400",
};

const STRENGTH_TEXT: Record<
  ReturnType<typeof getPasswordStrength>["score"],
  string
> = {
  0: "text-red-600 dark:text-red-400",
  1: "text-orange-600 dark:text-orange-400",
  2: "text-amber-600 dark:text-amber-400",
  3: "text-lime-700 dark:text-lime-400",
  4: "text-emerald-600 dark:text-emerald-400",
};

type PasswordStrengthPanelProps = {
  password: string;
  className?: string;
};

export function PasswordStrengthPanel({ password, className }: PasswordStrengthPanelProps) {
  const strength = getPasswordStrength(password);
  const showDetails = password.length > 0;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-500 dark:text-gh-fg-muted">قدرت رمز عبور</span>
          <span
            className={cn(
              "font-medium",
              showDetails ? STRENGTH_TEXT[strength.score] : "text-slate-400 dark:text-gh-fg-muted",
            )}
          >
            {showDetails ? strength.label : "—"}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-gh-canvas-inset">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              showDetails ? STRENGTH_BAR[strength.score] : "w-0 bg-transparent",
            )}
            style={{ width: showDetails ? `${Math.max(strength.percent, 8)}%` : "0%" }}
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-gh-fg-emphasis">
          الزامات رمز عبور
        </p>
        <ul className="space-y-1.5">
          {CHECK_LABELS.map(({ key, label }) => {
            const passed = strength.checks[key];
            return (
              <li
                key={key}
                className={cn(
                  "flex items-start gap-2 text-xs leading-relaxed",
                  passed
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-slate-500 dark:text-gh-fg-muted",
                )}
              >
                {passed ? (
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : (
                  <X className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                )}
                <span>{label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

type PasswordStrengthPopoverProps = {
  password: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
};

export function PasswordStrengthPopover({
  password,
  open,
  onOpenChange,
  children,
}: PasswordStrengthPopoverProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>
        <div className="w-full">{children}</div>
      </PopoverAnchor>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={10}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest("[data-password-field]")) {
            event.preventDefault();
          }
        }}
      >
        <PasswordStrengthPanel password={password} />
      </PopoverContent>
    </Popover>
  );
}

/** @deprecated Use PasswordStrengthPopover */
export function PasswordStrength({ password, className }: PasswordStrengthPanelProps) {
  return <PasswordStrengthPanel password={password} className={className} />;
}
