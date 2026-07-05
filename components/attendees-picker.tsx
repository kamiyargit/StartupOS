"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Check, ChevronDown, UserPlus, X } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserDTO } from "@/lib/dto";
import {
  MeetingAttendeesData,
  mergeGuestNames,
} from "@/lib/meeting-attendees";
import { cn } from "@/lib/utils";

export type AttendeesPickerHandle = {
  /** Commit any names still typed in the guest field before submit validation. */
  flushPendingGuests: () => MeetingAttendeesData;
};

type AttendeesPickerProps = {
  value: MeetingAttendeesData;
  onChange: (value: MeetingAttendeesData) => void;
  id?: string;
};

export const AttendeesPicker = forwardRef<AttendeesPickerHandle, AttendeesPickerProps>(
  function AttendeesPicker({ value, onChange, id }, ref) {
    const [users, setUsers] = useState<UserDTO[]>([]);
    const [open, setOpen] = useState(false);
    const [guestDraft, setGuestDraft] = useState("");

    useEffect(() => {
      fetch("/api/users")
        .then((r) => r.json())
        .then((data: UserDTO[]) => setUsers(data.filter((u) => u.isActive)));
    }, []);

    const flushPendingGuests = (): MeetingAttendeesData => {
      const next = mergeGuestNames(value, guestDraft);
      if (next.guests.length !== value.guests.length) {
        onChange(next);
        setGuestDraft("");
      }
      return next;
    };

    useImperativeHandle(ref, () => ({ flushPendingGuests }), [value, guestDraft, onChange]);

    const userMap = new Map(users.map((u) => [u.id, u.fullName]));
    const totalCount = value.userIds.length + value.guests.length;

    const triggerLabel =
      value.userIds.length === 0
        ? "انتخاب کاربران سامانه..."
        : `${value.userIds.length} کاربر انتخاب شده`;

    const toggleUser = (userId: string) => {
      const exists = value.userIds.includes(userId);
      onChange({
        ...value,
        userIds: exists
          ? value.userIds.filter((id) => id !== userId)
          : [...value.userIds, userId],
      });
    };

    const addGuests = () => {
      const next = mergeGuestNames(value, guestDraft);
      if (next.guests.length === value.guests.length) return;
      onChange(next);
      setGuestDraft("");
    };

    const removeGuest = (index: number) => {
      onChange({ ...value, guests: value.guests.filter((_, i) => i !== index) });
    };

    const removeUser = (userId: string) => {
      onChange({ ...value, userIds: value.userIds.filter((id) => id !== userId) });
    };

    return (
      <div className="space-y-4" id={id}>
        <div className="space-y-2">
          <Label>کاربران سامانه</Label>
          <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full justify-between font-normal"
                aria-label="انتخاب کاربران"
              >
                <span
                  className={cn(
                    "truncate",
                    value.userIds.length === 0 && "text-slate-500 dark:text-gh-fg-muted",
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
                className="z-50 w-[var(--radix-popover-trigger-width)] max-h-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md dark:border-gh-border dark:bg-gh-canvas-subtle"
              >
                <div className="max-h-72 overflow-y-auto p-2">
                  {users.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-slate-500 dark:text-gh-fg-muted">
                      کاربری یافت نشد.
                    </p>
                  ) : (
                    users.map((user) => {
                      const checked = value.userIds.includes(user.id);
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => toggleUser(user.id)}
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
                          <span className="min-w-0 flex-1 truncate">{user.fullName}</span>
                          {user.position && (
                            <span className="shrink-0 text-xs text-slate-500 dark:text-gh-fg-muted">
                              {user.position}
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>

          {value.userIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {value.userIds.map((userId) => (
                <span
                  key={userId}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs dark:bg-gh-neutral"
                >
                  {userMap.get(userId) ?? "کاربر"}
                  <button
                    type="button"
                    onClick={() => removeUser(userId)}
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

        <div className="space-y-2">
          <Label htmlFor={`${id ?? "attendees"}-guest`}>مهمان‌ها</Label>
          <div className="flex gap-2">
            <Input
              id={`${id ?? "attendees"}-guest`}
              value={guestDraft}
              onChange={(e) => setGuestDraft(e.target.value)}
              placeholder="نام مهمان — چند نفر را با ویرگول جدا کنید"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addGuests();
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={addGuests}
              className="shrink-0 gap-1"
            >
              <UserPlus className="h-4 w-4" />
              افزودن
            </Button>
          </div>
          <p className="text-xs text-slate-500 dark:text-gh-fg-muted">
            می‌توانید چند مهمان را پشت‌سرهم یا با ویرگول (،) اضافه کنید.
          </p>

          {value.guests.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {value.guests.map((guest, index) => (
                <span
                  key={`${guest}-${index}`}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-800 dark:bg-[#3d2e00] dark:text-[#d29922]"
                >
                  {guest} (مهمان)
                  <button
                    type="button"
                    onClick={() => removeGuest(index)}
                    className="rounded-full p-0.5 hover:bg-amber-100 dark:hover:bg-[#4a3800]"
                    aria-label="حذف مهمان"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {totalCount > 0 && (
          <p className="text-xs text-slate-500 dark:text-gh-fg-muted">
            {[
              value.userIds.length > 0 ? `${value.userIds.length} کاربر سامانه` : null,
              value.guests.length > 0 ? `${value.guests.length} مهمان` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>
    );
  },
);
