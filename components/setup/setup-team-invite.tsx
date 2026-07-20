"use client";

import { useCallback, useRef } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { setupInputClasses } from "@/components/setup/setup-field";
import { validateTeamFields } from "@/lib/setup/form-validation";

export type TeamInviteItem = {
  id: string;
  email: string;
};

const MAX_INVITES = 25;

export function createTeamInvite(email = ""): TeamInviteItem {
  return {
    id: `team-${Math.random().toString(36).slice(2, 11)}`,
    email,
  };
}

export function teamInvitesFromEmails(emails: string[]): TeamInviteItem[] {
  const rows = emails.filter(Boolean).map((email) => createTeamInvite(email));
  rows.push(createTeamInvite());
  return rows.length ? rows : [createTeamInvite()];
}

type SetupTeamInviteListProps = {
  items: TeamInviteItem[];
  onItemsChange: (items: TeamInviteItem[]) => void;
  adminEmail: string;
  errors: (string | undefined)[];
  onErrorsChange: (errors: (string | undefined)[]) => void;
  touched: Record<string, boolean>;
  onTouch: (fieldKey: string) => void;
};

function touchKey(id: string) {
  return `teamEmail-${id}`;
}

export function SetupTeamInviteList({
  items,
  onItemsChange,
  adminEmail,
  errors,
  onErrorsChange,
  touched,
  onTouch,
}: SetupTeamInviteListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const filledCount = items.filter((item) => item.email.trim()).length;

  const syncErrors = useCallback(
    (nextItems: TeamInviteItem[]) => {
      onErrorsChange(validateTeamFields(nextItems.map((item) => item.email), adminEmail));
    },
    [adminEmail, onErrorsChange],
  );

  const updateEmail = (id: string, email: string) => {
    const next = items.map((item) => (item.id === id ? { ...item, email } : item));
    onItemsChange(next);
    if (touched[touchKey(id)]) syncErrors(next);
  };

  const addItem = () => {
    if (items.length >= MAX_INVITES) return;
    const next = [...items, createTeamInvite()];
    onItemsChange(next);
    syncErrors(next);
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) {
      const next = [createTeamInvite()];
      onItemsChange(next);
      syncErrors(next);
      return;
    }
    const next = items.filter((item) => item.id !== id);
    onItemsChange(next);
    syncErrors(next);
  };

  return (
    <div className="space-y-4">
      <p className="text-center text-xs leading-relaxed text-slate-500 dark:text-gh-fg-muted sm:text-start">
        دعوت هم‌تیمی اختیاری است — فیلدهای خالی نادیده گرفته می‌شوند.
      </p>

      <div className="flex items-center justify-between gap-3 sm:px-1">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />
          <span className="text-sm font-medium text-slate-700 dark:text-gh-fg-emphasis">لیست دعوت‌ها</span>
        </div>
        <span className="shrink-0 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 dark:bg-primary-950 dark:text-primary-200">
          {filledCount} نفر
        </span>
      </div>

      <div
        className={cn(
          "rounded-2xl border border-slate-200 bg-slate-50/60 dark:border-gh-border dark:bg-gh-canvas-inset/40",
          "sm:bg-white/80 sm:dark:bg-gh-canvas-subtle/60",
        )}
      >
        <div
          ref={listRef}
          className={cn(
            "space-y-3 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 sm:py-4",
            "[scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.5)_transparent]",
            "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-gh-border",
            "max-h-[9.75rem] sm:max-h-[17.5rem] lg:max-h-[21rem]",
          )}
        >
          {items.map((item, index) => {
            const fieldKey = touchKey(item.id);
            const error = touched[fieldKey] ? errors[index] : undefined;
            const canRemove = items.length > 1 || item.email.trim().length > 0;

            return (
              <div key={item.id} className="flex items-start gap-2 sm:gap-3">
                <span
                  className="mt-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700 dark:bg-primary-950 dark:text-primary-300"
                  aria-hidden
                >
                  {index + 1}
                </span>

                <div className="min-w-0 flex-1 space-y-1">
                  <Input
                    dir="ltr"
                    type="email"
                    value={item.email}
                    onChange={(e) => updateEmail(item.id, e.target.value)}
                    onBlur={() => {
                      onTouch(fieldKey);
                      syncErrors(items);
                    }}
                    aria-invalid={!!error}
                    aria-label={`ایمیل هم‌تیمی ${index + 1}`}
                    className={setupInputClasses(!!error)}
                    placeholder="cofounder@example.com"
                  />
                  {error ? (
                    <p className="text-xs text-red-600 dark:text-gh-danger">{error}</p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  disabled={!canRemove}
                  aria-label={`حذف هم‌تیمی ${index + 1}`}
                  className={cn(
                    "mt-2.5 inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border transition",
                    canRemove
                      ? "border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-gh-border dark:text-gh-fg-muted dark:hover:border-gh-danger/40 dark:hover:bg-gh-danger/10 dark:hover:text-gh-danger"
                      : "cursor-not-allowed border-transparent text-slate-300 opacity-40 dark:text-gh-fg-muted",
                  )}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="border-t border-slate-200/80 px-3 py-3 dark:border-gh-border sm:px-4">
          <button
            type="button"
            onClick={addItem}
            disabled={items.length >= MAX_INVITES}
            className={cn(
              "flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed text-sm font-medium transition",
              items.length >= MAX_INVITES
                ? "cursor-not-allowed border-slate-200 text-slate-400 dark:border-gh-border dark:text-gh-fg-muted"
                : "border-primary-300 text-primary-700 hover:border-primary-400 hover:bg-primary-50 dark:border-primary-700 dark:text-primary-300 dark:hover:bg-primary-950/50",
            )}
          >
            <Plus className="h-4 w-4" />
            افزودن هم‌تیمی
          </button>
          {items.length >= MAX_INVITES ? (
            <p className="mt-2 text-center text-[11px] text-slate-500 dark:text-gh-fg-muted">
              حداکثر {MAX_INVITES} دعوت در هر بار
            </p>
          ) : null}
        </div>
      </div>

      <p className="hidden text-xs text-slate-500 dark:text-gh-fg-muted sm:block">
        در دسکتاپ می‌توانید چندین هم‌تیمی را یکجا اضافه کنید. لیست به‌صورت خودکار اسکرول می‌شود.
      </p>
    </div>
  );
}

export function touchAllTeamFields(items: TeamInviteItem[]): Record<string, boolean> {
  return Object.fromEntries(items.map((item) => [touchKey(item.id), true]));
}

export { touchKey as teamInviteTouchKey };
