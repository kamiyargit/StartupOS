"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MeetingMinutesForm } from "@/components/meeting-minutes-form";
import { MeetingMinutesDTO } from "@/lib/dto";
import { toGregorianString } from "@/lib/dates";

export default function EditMeetingMinutesPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [item, setItem] = useState<MeetingMinutesDTO | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (session?.user?.role !== "ADMIN") {
      router.replace(`/meeting-minutes/${id}`);
    }
  }, [session, status, router, id]);

  useEffect(() => {
    fetch(`/api/meeting-minutes/${id}`)
      .then((r) => r.json())
      .then(setItem);
  }, [id]);

  if (status === "loading" || session?.user?.role !== "ADMIN") {
    return <p className="text-sm text-slate-500">در حال بارگذاری...</p>;
  }

  if (!item) {
    return <p className="text-sm text-slate-500">در حال بارگذاری...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">ویرایش صورتجلسه</h1>
          <p className="text-sm text-slate-500">به‌روزرسانی اطلاعات صورتجلسه</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/meeting-minutes/${id}`}>انصراف</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">فرم ویرایش</CardTitle>
        </CardHeader>
        <CardContent>
          <MeetingMinutesForm
            submitLabel="ذخیره تغییرات"
            loadingLabel="در حال ذخیره..."
            requireFile={false}
            initial={{
              meetingDate: new Date(item.meetingDate),
              subject: item.subject,
              attendees: item.attendees,
              summary: item.summary ?? "",
              decisions: item.decisions ?? "",
              status: item.status,
              file: null,
            }}
            onSubmit={async (values) => {
              if (!values.meetingDate) {
                toast.error("تاریخ جلسه الزامی است.");
                return false;
              }

              const body: Record<string, unknown> = {
                meetingDate: toGregorianString(values.meetingDate),
                subject: values.subject,
                attendees: values.attendees,
                summary: values.summary || null,
                decisions: values.decisions || null,
                status: values.status,
              };

              if (values.file) {
                body.attachmentId = values.file.id;
              }

              const res = await fetch(`/api/meeting-minutes/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              });

              if (!res.ok) {
                const data = await res.json();
                toast.error(data.error ?? "خطا در ویرایش صورتجلسه");
                return false;
              }

              toast.success("صورتجلسه به‌روزرسانی شد.");
              router.push(`/meeting-minutes/${id}`);
              return true;
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
