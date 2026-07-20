"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppLogo } from "@/components/app-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { SetupStepper, SETUP_STEPS } from "@/components/setup/setup-stepper";

type SetupShellProps = {
  currentStepId: string;
  onBack?: () => void;
  loading?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

const STEP_COPY: Record<string, { title: string; subtitle: string }> = {
  ACCOUNT: {
    title: "شروع کنید",
    subtitle: "ایمیل و رمز عبور مدیر کسب‌وکار را وارد کنید",
  },
  BUSINESS: {
    title: "کسب‌وکار شما",
    subtitle: "نام، نوع فعالیت و آدرس اختصاصی را انتخاب کنید",
  },
  TEAM: {
    title: "دعوت تیم",
    subtitle: "اختیاری — می‌توانید بعداً اعضا را اضافه کنید",
  },
  REVIEW: {
    title: "تقریباً تمام شد!",
    subtitle: "اطلاعات را بررسی کنید و کسب‌وکار خود را راه‌اندازی کنید",
  },
};

export function SetupShell({ currentStepId, onBack, loading, children, footer }: SetupShellProps) {
  const copy = STEP_COPY[currentStepId] ?? { title: "راه‌اندازی کارتین", subtitle: "" };
  const stepIndex = SETUP_STEPS.findIndex((s) => s.id === currentStepId);
  const canGoBack = stepIndex > 0 && onBack;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-gh-canvas">
      {/* Gradient hero — light & dark variants */}
      <header className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 px-4 pb-16 pt-4 text-white dark:from-primary-800 dark:via-primary-900 dark:to-[#0f0d24] sm:px-6 sm:pb-20 sm:pt-6 lg:pb-24">
        {/* Decorative shapes */}
        <div
          className="pointer-events-none absolute -end-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl dark:bg-primary-400/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 start-0 h-56 w-56 rounded-full bg-primary-400/20 blur-3xl dark:bg-primary-500/15"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute end-1/4 top-1/3 h-24 w-24 rounded-full border border-white/10 bg-white/5 dark:border-white/5"
          aria-hidden
        />

        <div className="relative mx-auto max-w-2xl lg:max-w-3xl">
          {/* Top bar */}
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {canGoBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-white/90 transition hover:bg-white/10"
                >
                  <ArrowRight className="h-4 w-4" />
                  <span className="hidden sm:inline">بازگشت</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <AppLogo src="/logo.svg" size={32} className="h-8 w-8 rounded-lg bg-white/10 p-0.5" />
                  <span className="text-sm font-semibold sm:text-base">کارتین</span>
                </div>
              )}
            </div>
            <ThemeToggle
              variant="icon"
              className="text-white hover:bg-white/10 dark:text-white dark:hover:bg-white/10"
            />
          </div>

          <div className="mb-2 hidden text-sm text-white/80 sm:block">
            راه‌اندازی کسب‌وکار · مرحله {stepIndex + 1} از {SETUP_STEPS.length}
          </div>

          <SetupStepper currentStepId={currentStepId} />
        </div>
      </header>

      {/* Content card overlapping header */}
      <main className="relative z-10 mx-auto -mt-10 max-w-2xl px-4 pb-10 sm:-mt-12 sm:px-6 lg:max-w-3xl lg:-mt-14">
        <div
          className={cn(
            "overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-primary-900/5",
            "dark:border-gh-border dark:bg-gh-canvas-subtle dark:shadow-none",
          )}
        >
          <div className="border-b border-slate-100 px-5 py-6 text-center dark:border-gh-border sm:px-8 sm:py-8">
            <h1 className="text-xl font-bold text-primary-900 dark:text-primary-50 sm:text-2xl">
              {copy.title}
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500 dark:text-gh-fg-muted">
              {copy.subtitle}
            </p>
          </div>

          <div className="px-5 py-6 sm:px-8 sm:py-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-500 dark:text-gh-fg-muted">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600 dark:text-primary-400" />
                <p className="text-sm">در حال بارگذاری...</p>
              </div>
            ) : (
              children
            )}
          </div>

          {footer && !loading ? (
            <div className="border-t border-slate-100 bg-slate-50/80 px-5 py-5 dark:border-gh-border dark:bg-gh-canvas-inset/50 sm:px-8">
              {footer}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
