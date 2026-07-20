"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MeetingMinutesDTO, UserDTO } from "@/lib/dto";
import { meetingMinutesStatusLabel } from "@/lib/meeting-minutes-labels";
import { resolveAttendeesDisplay } from "@/lib/meeting-attendees";
import { formatBytes, formatDateTimeFa } from "@/lib/format";
import {
  FileText,
  ImageIcon,
  Pencil,
  Trash2,
  ArrowRight,
  Calendar,
  Users,
  User,
  Hash,
  Paperclip,
  ExternalLink,
  ClipboardList,
  Gavel,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isAdminRole } from "@/lib/deployment-client";

function statusClass(status: MeetingMinutesDTO["status"]) {
  return cn(
    "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
    status === "APPROVED"
      ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400"
      : "bg-amber-50 text-amber-700 dark:bg-[#3d2e00] dark:text-[#d29922]",
  );
}

export default function MeetingMinutesDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const [item, setItem] = useState<MeetingMinutesDTO | null>(null);
  const [users, setUsers] = useState<UserDTO[]>([]);

  const isAdmin = isAdminRole(session?.user?.role ?? "");

  useEffect(() => {
    fetch(`/api/meeting-minutes/${id}`)
      .then((r) => r.json())
      .then(setItem);
    fetch("/api/users?all=true")
      .then((r) => r.json())
      .then(setUsers);
  }, [id]);

  const onDelete = async () => {
    if (!confirm("آیا از حذف این صورتجلسه مطمئن هستید؟")) return;
    const res = await fetch(`/api/meeting-minutes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("خطا در حذف");
      return;
    }
    toast.success("حذف شد.");
    router.push("/meeting-minutes");
  };

  if (!item) {
    return <p className="text-sm text-slate-500 dark:text-gh-fg-muted">در حال بارگذاری...</p>;
  }

  const doc = item.document;
  const attendees = resolveAttendeesDisplay(item.attendees, users);
  const attendeeCount = attendees.systemUsers.length + attendees.guests.length;
  const accentColor = item.status === "APPROVED" ? "#238636" : "#d29922";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-xl font-bold sm:text-2xl">جزئیات صورتجلسه</h1>
            <span className={statusClass(item.status)}>{meetingMinutesStatusLabel(item.status)}</span>
          </div>
          <p className="text-lg font-semibold text-slate-800 dark:text-gh-fg">{item.subject}</p>
          <p className="text-sm text-slate-500 dark:text-gh-fg-muted" dir="ltr">
            شناسه: {item.id}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none">
            <Link href="/meeting-minutes">
              <ArrowRight className="h-4 w-4" />
              بازگشت
            </Link>
          </Button>
          {isAdmin && (
            <>
              <Button variant="secondary" size="sm" asChild className="flex-1 sm:flex-none">
                <Link href={`/meeting-minutes/${id}/edit`}>
                  <Pencil className="h-4 w-4" />
                  ویرایش
                </Link>
              </Button>
              <Button variant="destructive" size="sm" onClick={onDelete} className="flex-1 sm:flex-none">
                <Trash2 className="h-4 w-4" />
                حذف
              </Button>
            </>
          )}
        </div>
      </div>

      <div
        className="rounded-xl border border-slate-200 p-4 dark:border-gh-border sm:p-6"
        style={{ borderInlineStartWidth: 4, borderInlineStartColor: accentColor }}
      >
        <p className="text-sm text-slate-500 dark:text-gh-fg-muted">تاریخ جلسه</p>
        <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-gh-fg sm:text-3xl">
          {item.meetingDateJalali}
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-gh-fg-muted" dir="ltr">
          {item.meetingDate}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-gh-fg-muted">
              <User className="h-4 w-4" />
              ثبت‌کننده
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{item.createdByName}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-gh-fg-muted">
              <Users className="h-4 w-4" />
              افراد حاضر
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-medium">{attendeeCount} نفر</p>
            <p className="text-slate-500 dark:text-gh-fg-muted">
              {attendees.systemUsers.length} کاربر سامانه
              {attendees.guests.length > 0 ? ` · ${attendees.guests.length} مهمان` : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-gh-fg-muted">
              <Hash className="h-4 w-4" />
              زمان ثبت
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-slate-500 dark:text-gh-fg-muted">ایجاد: </span>
              {formatDateTimeFa(item.createdAt)}
            </p>
            <p>
              <span className="text-slate-500 dark:text-gh-fg-muted">آخرین ویرایش: </span>
              {formatDateTimeFa(item.updatedAt)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-gh-fg-muted">
              <Paperclip className="h-4 w-4" />
              فایل پیوست
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {doc ? (
              <>
                <p className="font-medium">۱ فایل</p>
                <p className="truncate text-slate-500 dark:text-gh-fg-muted">{doc.fileName}</p>
                <p className="text-slate-500 dark:text-gh-fg-muted">حجم: {formatBytes(doc.sizeBytes)}</p>
              </>
            ) : (
              <p className="text-slate-500 dark:text-gh-fg-muted">فایلی پیوست نشده</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-slate-500 dark:text-gh-fg-muted" />
            افراد حاضر در جلسه
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {attendeeCount === 0 ? (
            <p className="text-sm text-slate-500 dark:text-gh-fg-muted">—</p>
          ) : (
            <>
              {attendees.systemUsers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-gh-fg-muted">کاربران سامانه</p>
                  <div className="flex flex-wrap gap-2">
                    {attendees.systemUsers.map((name, i) => (
                      <span
                        key={`user-${i}-${name}`}
                        className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm dark:bg-gh-neutral"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {attendees.guests.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-gh-fg-muted">مهمان‌ها</p>
                  <div className="flex flex-wrap gap-2">
                    {attendees.guests.map((guest, i) => (
                      <span
                        key={`guest-${i}-${guest.name}`}
                        className="inline-flex flex-col rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-800 dark:bg-[#3d2e00] dark:text-[#d29922]"
                      >
                        <span>{guest.name} (مهمان)</span>
                        {guest.description && (
                          <span className="text-xs opacity-80">{guest.description}</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4 text-slate-500 dark:text-gh-fg-muted" />
              خلاصه جلسه
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-gh-fg-emphasis">
              {item.summary?.trim() || "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gavel className="h-4 w-4 text-slate-500 dark:text-gh-fg-muted" />
              مصوبات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-gh-fg-emphasis">
              {item.decisions?.trim() || "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-slate-500 dark:text-gh-fg-muted" />
            فایل صورتجلسه
          </CardTitle>
          {doc && (
            <Button variant="outline" size="sm" asChild>
              <a href={doc.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                باز کردن فایل
              </a>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!doc ? (
            <p className="text-sm text-slate-500 dark:text-gh-fg-muted">فایلی برای این صورتجلسه ثبت نشده است.</p>
          ) : (
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block overflow-hidden rounded-lg border border-slate-200 transition hover:border-primary-400 dark:border-gh-border dark:hover:border-primary-600 sm:max-w-lg"
            >
              {doc.mimeType.startsWith("image/") ? (
                <div className="aspect-video bg-slate-100 dark:bg-gh-neutral">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={doc.url}
                    alt={doc.fileName}
                    className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                  />
                </div>
              ) : (
                <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-slate-50 dark:bg-gh-neutral">
                  <FileText className="h-14 w-14 text-primary-600 dark:text-primary-400" />
                  <span className="text-sm text-slate-500 dark:text-gh-fg-muted">PDF / سند</span>
                </div>
              )}
              <div className="flex items-center gap-2 border-t border-slate-100 p-3 dark:border-gh-border">
                {doc.mimeType.startsWith("image/") ? (
                  <ImageIcon className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{doc.fileName}</p>
                  <p className="text-xs text-slate-500 dark:text-gh-fg-muted">{formatBytes(doc.sizeBytes)}</p>
                </div>
              </div>
            </a>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
