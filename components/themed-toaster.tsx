"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/components/theme-provider";

export function ThemedToaster() {
  const { theme, mounted } = useTheme();

  return (
    <Toaster
      position="top-center"
      richColors
      theme={mounted ? theme : "light"}
      toastOptions={{
        classNames: {
          toast:
            "font-sans !rounded-lg !border !shadow-lg dark:!bg-gh-canvas-subtle dark:!border-gh-border dark:!text-gh-fg",
          title: "dark:!text-gh-fg",
          description: "dark:!text-gh-fg-muted",
          success:
            "dark:!bg-emerald-950/90 dark:!border-emerald-800 dark:!text-emerald-100 [&_[data-title]]:dark:!text-emerald-50",
          error:
            "dark:!bg-red-950/90 dark:!border-red-800 dark:!text-red-100 [&_[data-title]]:dark:!text-red-50",
          warning:
            "dark:!bg-amber-950/90 dark:!border-amber-800 dark:!text-amber-100 [&_[data-title]]:dark:!text-amber-50",
          info: "dark:!bg-sky-950/90 dark:!border-sky-800 dark:!text-sky-100 [&_[data-title]]:dark:!text-sky-50",
        },
      }}
    />
  );
}
