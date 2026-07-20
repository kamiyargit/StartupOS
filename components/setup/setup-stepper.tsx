"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Building2, CheckCircle2, UserRound, Users } from "lucide-react";

export type SetupStepConfig = {
  id: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
};

export const SETUP_STEPS: SetupStepConfig[] = [
  { id: "ACCOUNT", label: "حساب کاربری", shortLabel: "حساب", icon: UserRound },
  { id: "BUSINESS", label: "کسب‌وکار", shortLabel: "کسب‌وکار", icon: Building2 },
  { id: "TEAM", label: "تیم", shortLabel: "تیم", icon: Users },
  { id: "REVIEW", label: "تأیید", shortLabel: "تأیید", icon: CheckCircle2 },
];

type SetupStepperProps = {
  currentStepId: string;
  className?: string;
};

const STEP_COUNT = SETUP_STEPS.length;
const TRACK_INSET = "12.5%";
const TRACK_SPAN = `${100 - 2 * 12.5}%`;

export function SetupStepper({ currentStepId, className }: SetupStepperProps) {
  const currentIndex = Math.max(0, SETUP_STEPS.findIndex((s) => s.id === currentStepId));
  const trackProgress =
    STEP_COUNT > 1 ? (currentIndex / (STEP_COUNT - 1)) * 100 : 0;
  const mobileProgress = ((currentIndex + 1) / STEP_COUNT) * 100;

  return (
    <nav className={cn("w-full", className)} aria-label="مراحل راه‌اندازی">
      {/* Mobile: compact summary */}
      <div className="mb-1 flex items-center justify-between gap-2 sm:hidden">
        <p className="text-xs font-medium text-white/90">
          مرحله {currentIndex + 1} از {STEP_COUNT}
        </p>
        <p className="truncate text-xs text-white/75">{SETUP_STEPS[currentIndex]?.label}</p>
      </div>
      <div className="relative mb-4 h-1 overflow-hidden rounded-full bg-white/20 sm:hidden">
        <div
          className="absolute inset-y-0 end-0 rounded-full bg-white transition-all duration-300"
          style={{ width: `${mobileProgress}%` }}
        />
      </div>

      {/* Stepper — inherits RTL; step 1 sits on the right */}
      <div className="relative w-full">
        {/* Track between first and last step centers */}
        <div
          className="pointer-events-none absolute top-5 h-0.5 bg-white/30 sm:top-[1.375rem]"
          style={{ insetInlineStart: TRACK_INSET, width: TRACK_SPAN }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute top-5 h-0.5 bg-white transition-all duration-300 sm:top-[1.375rem]"
          style={{
            insetInlineStart: TRACK_INSET,
            width: `${trackProgress * 0.75}%`,
          }}
          aria-hidden
        />

        <ol className="relative m-0 grid list-none grid-cols-4 gap-0 p-0">
          {SETUP_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isComplete = index < currentIndex;
            const isActive = index === currentIndex;
            const isUpcoming = index > currentIndex;

            return (
              <li key={step.id} className="flex flex-col items-center">
                <div
                  className={cn(
                    "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all sm:h-11 sm:w-11",
                    isActive &&
                      "border-white bg-white text-primary-700 shadow-lg shadow-primary-900/30 dark:shadow-black/40",
                    isComplete && "border-white/80 bg-primary-500/90 text-white dark:bg-primary-600/90",
                    isUpcoming && "border-white/35 bg-white/10 text-white/60",
                  )}
                  aria-current={isActive ? "step" : undefined}
                >
                  <Icon className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" aria-hidden />
                </div>
                <span
                  className={cn(
                    "mt-2 max-w-full truncate px-0.5 text-center text-[10px] font-medium leading-tight sm:text-xs",
                    isActive ? "text-white" : "text-white/75",
                  )}
                >
                  <span className="sm:hidden">{step.shortLabel}</span>
                  <span className="hidden sm:inline">{step.label}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
