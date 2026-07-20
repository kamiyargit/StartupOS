"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

type SetupFieldProps = {
  label: string;
  hint?: string;
  error?: string;
  success?: string;
  children: React.ReactNode;
  className?: string;
};

export function SetupField({ label, hint, error, success, children, className }: SetupFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium text-slate-700 dark:text-gh-fg-emphasis">{label}</Label>
      {children}
      {hint && !error && !success && (
        <p className="text-xs text-slate-500 dark:text-gh-fg-muted">{hint}</p>
      )}
      {success && <p className="text-xs text-primary-600 dark:text-primary-400">{success}</p>}
      {error && <p className="text-xs text-red-600 dark:text-gh-danger">{error}</p>}
    </div>
  );
}

export const setupInputClassName =
  "h-12 rounded-xl border-slate-200 bg-slate-50/50 text-base transition focus-visible:bg-white dark:border-gh-border dark:bg-gh-canvas-inset dark:focus-visible:bg-gh-canvas-subtle";

export const setupInputInvalidClassName =
  "border-red-400 focus-visible:ring-red-500/30 dark:border-gh-danger dark:focus-visible:ring-gh-danger/30";

export function setupInputClasses(invalid?: boolean) {
  return cn(setupInputClassName, invalid && setupInputInvalidClassName);
}

export const setupSelectClassName =
  "flex h-12 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gh-border dark:bg-gh-canvas-inset dark:text-gh-fg";

export function SetupPrimaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-full bg-primary-600 px-6 text-sm font-semibold text-white shadow-md shadow-primary-600/25 transition",
        "hover:bg-primary-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50",
        "dark:bg-primary-500 dark:shadow-primary-900/40 dark:hover:bg-primary-600",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function SetupSecondaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50",
        "dark:border-gh-border dark:bg-gh-canvas-subtle dark:text-gh-fg dark:hover:bg-gh-neutral",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
