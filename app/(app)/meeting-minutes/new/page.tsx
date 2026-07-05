"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MeetingMinutesForm } from "@/components/meeting-minutes-form";
import { toGregorianString } from "@/lib/dates";

export default function NewMeetingMinutesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;
    if (session?.user?.role !== "ADMIN") {
      router.replace("/meeting-minutes");
    }
  }, [session, status, router]);

  if (status === "loading" || session?.user?.role !== "ADMIN") {
    return <p className="text-sm text-slate-500">در حال بارگذاری...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ثبت صورتجلسه</h1>
        <p className="text-sm text-slate-500">افزودن صورتجلسه جلسه هیئت‌مدیره</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">فرم ثبت</CardTitle>
        </CardHeader>
        <CardContent>
          <MeetingMinutesForm
            submitLabel="ثبت صورتجلسه"
            loadingLabel="در حال ثبت..."
            onSubmit={async (values) => {
              if (!values.meetingDate) {
                toast.error("تاریخ جلسه الزامی است.");
                return false;
              }
              if (!values.file) {
                toast.error("فایل صورتجلسه الزامی است.");
                return false;
              }

              const res = await fetch("/api/meeting-minutes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  meetingDate: toGregorianString(values.meetingDate),
                  subject: values.subject,
                  attendees: values.attendees,
                  summary: values.summary || null,
                  decisions: values.decisions || null,
                  status: values.status,
                  attachmentId: values.file.id,
                }),
              });

              if (!res.ok) {
                const data = await res.json();
                toast.error(data.error ?? "خطا در ثبت صورتجلسه");
                return false;
              }

              toast.success("صورتجلسه با موفقیت ثبت شد.");
              router.push("/meeting-minutes");
              return true;
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
