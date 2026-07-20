"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Plus, LayoutGrid, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/pagination";
import { PaginatedResponse, TaskDTO } from "@/lib/dto";
import { cn } from "@/lib/utils";

const priorityLabel: Record<TaskDTO["priority"], string> = {
  LOW: "کم",
  MEDIUM: "متوسط",
  HIGH: "بالا",
  URGENT: "فوری",
};

export default function TasksInboxPage() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback((p = page) => {
    setLoading(true);
    fetch(`/api/tasks?view=inbox&page=${p}&pageSize=20`)
      .then((r) => r.json())
      .then((data: PaginatedResponse<TaskDTO>) => {
        setTasks(data.items ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
        setPage(data.page ?? p);
      })
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const acknowledge = async (taskId: string) => {
    const res = await fetch(`/api/tasks/${taskId}/acknowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) load(page);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">وظایف — صف کار</h1>
          <p className="text-sm text-slate-500 dark:text-gh-fg-muted">وظایف محول‌شده و نیازمند تأیید</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/tasks/board">
              <LayoutGrid className="h-4 w-4" />
              برد کانبان
            </Link>
          </Button>
          <Button asChild>
            <Link href="/tasks/new">
              <Plus className="h-4 w-4" />
              وظیفه جدید
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Inbox className="h-4 w-4" />
            صندوق ورودی
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">در حال بارگذاری...</p>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-slate-500">وظیفه‌ای یافت نشد.</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const myAck = task.acknowledgements.find((a) => a.userId === session?.user?.id);
                const ackDone = task.acknowledgements.filter((a) => a.acknowledgedAt).length;
                const ackTotal = task.acknowledgements.length;
                return (
                  <div key={task.id} className="rounded-lg border border-slate-200 p-4 dark:border-gh-border">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Link href={`/tasks/${task.id}`} className="font-medium hover:text-primary-700">
                        {task.title}
                      </Link>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs",
                          task.priority === "URGENT"
                            ? "bg-red-100 text-red-700"
                            : task.priority === "HIGH"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600",
                        )}
                      >
                        {priorityLabel[task.priority]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {task.assigneeName ? `مسئول: ${task.assigneeName}` : "بدون مسئول"}
                      {task.dueDateJalali ? ` · سررسید: ${task.dueDateJalali}` : ""}
                    </p>
                    {ackTotal > 0 && (
                      <p className="mt-2 text-xs text-slate-500">
                        تأیید: {ackDone}/{ackTotal}
                      </p>
                    )}
                    {myAck && !myAck.acknowledgedAt && (
                      <Button size="sm" className="mt-3" onClick={() => acknowledge(task.id)}>
                        تأیید می‌کنم
                      </Button>
                    )}
                  </div>
                );
              })}
              <Pagination page={page} totalPages={totalPages} total={total} pageSize={20} onPageChange={load} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
