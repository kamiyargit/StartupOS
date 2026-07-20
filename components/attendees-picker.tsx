"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Check, ChevronDown, UserPlus, X } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserDTO } from "@/lib/dto";
import {
  MeetingAttendeesData,
  addGuest,
  mergeGuestNames,
} from "@/lib/meeting-attendees";
import { cn } from "@/lib/utils";

export type AttendeesPickerHandle = {
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
    const [guestName, setGuestName] = useState("");
    const [guestDescription, setGuestDescription] = useState("");

    useEffect(() => {
      fetch("/api/users?all=true")
        .then((r) => r.json())
        .then((data: UserDTO[]) => setUsers(data.filter((u) => u.isActive)));
    }, []);

    const flushPendingGuests = (): MeetingAttendeesData => {
      let next = value;
      if (guestName.trim()) {
        next = addGuest(next, { name: guestName, description: guestDescription });
        onChange(next);
        setGuestName("");
        setGuestDescription("");
      } else {
        next = mergeGuestNames(value, guestName);
        if (next.guests.length !== value.guests.length) {
          onChange(next);
          setGuestName("");
        }
      }
      return next;
    };

    useImperativeHandle(ref, () => ({ flushPendingGuests }), [value, guestName, guestDescription, onChange]);

    const userMap = new Map(users.map((u) => [u.id, u]));
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

    const addGuestEntry = () => {
      if (!guestName.trim()) return;
      onChange(addGuest(value, { name: guestName, description: guestDescription }));
      setGuestName("");
      setGuestDescription("");
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
                            "flex w-full items-start gap-2 rounded-md px-2 py-2 text-start text-sm transition",
                            checked
                              ? "bg-primary-50 text-primary-800 dark:bg-primary-950 dark:text-primary-400"
                              : "hover:bg-slate-100 dark:hover:bg-gh-neutral",
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                              checked
                                ? "border-primary-600 bg-primary-600 text-white dark:border-gh-success dark:bg-gh-success"
                                : "border-slate-300 dark:border-gh-border",
                            )}
                          >
                            {checked && <Check className="h-3 w-3" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{user.fullName}</span>
                            {user.position && (
                              <span className="block text-xs text-slate-500 dark:text-gh-fg-muted">
                                {user.position}
                              </span>
                            )}
                          </span>
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
              {value.userIds.map((userId) => {
                const user = userMap.get(userId);
                return (
                  <span
                    key={userId}
                    className="inline-flex max-w-full flex-col rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs dark:bg-gh-neutral"
                  >
                    <span className="inline-flex items-center gap-1">
                      <span className="font-medium">{user?.fullName ?? "کاربر"}</span>
                      <button
                        type="button"
                        onClick={() => removeUser(userId)}
                        className="rounded-full p-0.5 hover:bg-slate-200 dark:hover:bg-gh-neutral-emphasis"
                        aria-label="حذف"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                    {user?.position && (
                      <span className="text-slate-500 dark:text-gh-fg-muted">{user.position}</span>
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${id ?? "attendees"}-guest-name`}>مهمان‌ها</Label>
          <Input
            id={`${id ?? "attendees"}-guest-name`}
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="نام مهمان"
          />
          <Textarea
            id={`${id ?? "attendees"}-guest-desc`}
            value={guestDescription}
            onChange={(e) => setGuestDescription(e.target.value)}
            placeholder="توضیح (اختیاری) — مثلاً چرا در جلسه حضور داشت؟"
            rows={2}
          />
          <Button type="button" variant="secondary" onClick={addGuestEntry} className="gap-1">
            <UserPlus className="h-4 w-4" />
            افزودن مهمان
          </Button>

          {value.guests.length > 0 && (
            <div className="space-y-2">
              {value.guests.map((guest, index) => (
                <div
                  key={`${guest.name}-${index}`}
                  className="flex items-start justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs dark:border-[#3d2e00] dark:bg-[#3d2e00]"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-amber-900 dark:text-[#d29922]">
                      {guest.name} <span className="font-normal">(مهمان)</span>
                    </p>
                    {guest.description && (
                      <p className="mt-0.5 text-amber-800/80 dark:text-[#d29922]/80">
                        {guest.description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeGuest(index)}
                    className="shrink-0 rounded-full p-0.5 hover:bg-amber-100 dark:hover:bg-[#4a3800]"
                    aria-label="حذف مهمان"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
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
