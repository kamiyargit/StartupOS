"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";

type ThemeToggleProps = {
  className?: string;
  /** @deprecated use variant="segmented" */
  showLabel?: boolean;
  variant?: "icon" | "segmented";
};

export function ThemeToggle({ className, showLabel = false, variant = "segmented" }: ThemeToggleProps) {
  const { theme, setTheme, mounted } = useTheme();
  const effectiveVariant = showLabel ? "segmented" : variant;

  if (!mounted) {
    return (
      <div
        className={cn(
          effectiveVariant === "segmented" ? "h-9 w-[7.25rem] rounded-lg bg-slate-100 dark:bg-gh-neutral" : "h-10 w-10",
          className,
        )}
        aria-hidden
      />
    );
  }

  if (effectiveVariant === "icon") {
    return (
      <button
        type="button"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className={cn(
          "inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 dark:text-gh-fg-muted dark:hover:bg-gh-neutral",
          className,
        )}
        aria-label={theme === "dark" ? "حالت روشن" : "حالت تاریک"}
        title={theme === "dark" ? "حالت روشن" : "حالت تاریک"}
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-gh-border dark:bg-gh-neutral",
        className,
      )}
      role="group"
      aria-label="انتخاب تم"
    >
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition sm:px-3 sm:text-sm",
          theme === "light"
            ? "bg-white text-primary-800 shadow-sm dark:bg-gh-canvas-subtle dark:text-primary-100"
            : "text-slate-600 hover:text-slate-900 dark:text-gh-fg-muted dark:hover:text-gh-fg",
        )}
        aria-pressed={theme === "light"}
      >
        <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span>روشن</span>
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition sm:px-3 sm:text-sm",
          theme === "dark"
            ? "bg-white text-primary-800 shadow-sm dark:bg-gh-canvas-subtle dark:text-primary-100"
            : "text-slate-600 hover:text-slate-900 dark:text-gh-fg-muted dark:hover:text-gh-fg",
        )}
        aria-pressed={theme === "dark"}
      >
        <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span>تاریک</span>
      </button>
    </div>
  );
}
