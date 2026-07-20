"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TaskDTO } from "@/lib/dto";

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [task, setTask] = useState<TaskDTO | null>(null);

  useEffect(() => {
    fetch(`/api/tasks/${id}`).then((r) => r.json()).then(setTask);
  }, [id]);

  const acknowledge = async () => {
    const res = await fetch(`/api/tasks/${id}/acknowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      toast.error("خطا در ثبت تأیید");
      return;
    }
    setTask(await res.json());
    toast.success("تأیید ثبت شد.");
  };

  if (!task) return <p className="text-sm text-slate-500">در حال بارگذاری...</p>;

  const myAck = task.acknowledgements.find((a) => a.userId === session?.user?.id);
  const ackDone = task.acknowledgements.filter((a) => a.acknowledgedAt).length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{task.title}</h1>
        <Button variant="outline" asChild>
          <Link href="/tasks">بازگشت</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">جزئیات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{task.description ?? "—"}</p>
          <p>اولویت: {task.priority} · وضعیت: {task.status}</p>
          <p>مسئول: {task.assigneeName ?? "—"}</p>
          <p>سررسید: {task.dueDateJalali ?? "—"}</p>
          {task.labels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {task.labels.map((l) => (
                <span key={l.id} className="rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: `${l.color}22`, color: l.color }}>
                  {l.name}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {task.acknowledgements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">تأییدکنندگان ({ackDone}/{task.acknowledgements.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {task.acknowledgements.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-sm dark:border-gh-border">
                <span>{a.userName}</span>
                <span className={a.acknowledgedAt ? "text-primary-600" : "text-amber-600"}>
                  {a.acknowledgedAt ? "تأیید شده" : "در انتظار"}
                </span>
              </div>
            ))}
            {myAck && !myAck.acknowledgedAt && (
              <Button onClick={acknowledge}>تأیید می‌کنم</Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
