"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Inbox, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskDTO } from "@/lib/dto";
import { cn } from "@/lib/utils";

const DEFAULT_LABELS: Record<string, string> = {
  todo: "انجام نشده",
  in_progress: "در حال انجام",
  review: "بررسی",
  done: "انجام شده",
};

export default function TasksBoardPage() {
  const [columns, setColumns] = useState<string[]>([]);
  const [columnLabels, setColumnLabels] = useState<Record<string, string>>(DEFAULT_LABELS);
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const loadBoard = useCallback(() => {
    Promise.all([
      fetch("/api/task-boards").then((r) => r.json()),
      fetch("/api/tasks?pageSize=100").then((r) => r.json()),
    ]).then(([board, data]) => {
      setColumns(board.columns ?? ["todo", "in_progress", "review", "done"]);
      setColumnLabels({ ...DEFAULT_LABELS, ...(board.columnLabels ?? {}) });
      setTasks(data.items ?? []);
    });
  }, []);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const moveTask = async (taskId: string, status: string) => {
    const previous = tasks;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setTasks(previous);
    }
  };

  const labelFor = (col: string) => columnLabels[col] ?? DEFAULT_LABELS[col] ?? col.replace(/_/g, " ");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">برد کانبان</h1>
          <p className="text-sm text-slate-500">کارت‌ها را بکشید و در ستون‌ها رها کنید</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/tasks">
              <Inbox className="h-4 w-4" />
              صف کار
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/settings/tasks">
              <Settings className="h-4 w-4" />
              تنظیمات برد
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

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <Card
            key={col}
            className={cn(
              "min-w-[16rem] shrink-0 flex-1 transition",
              dropTarget === col && "border-primary-400 ring-2 ring-primary-100 dark:border-primary-600 dark:ring-primary-900",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDropTarget(col);
            }}
            onDragLeave={() => setDropTarget((current) => (current === col ? null : current))}
            onDrop={(e) => {
              e.preventDefault();
              const taskId = e.dataTransfer.getData("text/task-id") || draggingId;
              if (taskId) moveTask(taskId, col);
              setDraggingId(null);
              setDropTarget(null);
            }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{labelFor(col)}</CardTitle>
            </CardHeader>
            <CardContent className="min-h-[12rem] space-y-2">
              {tasks
                .filter((t) => t.status === col)
                .map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => {
                      setDraggingId(task.id);
                      e.dataTransfer.setData("text/task-id", task.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDropTarget(null);
                    }}
                    className={cn(
                      "cursor-grab rounded-lg border border-slate-200 bg-white p-3 text-sm active:cursor-grabbing dark:border-gh-border dark:bg-gh-canvas-subtle",
                      draggingId === task.id && "opacity-60",
                    )}
                  >
                    <Link href={`/tasks/${task.id}`} className="font-medium hover:text-primary-700" onClick={(e) => e.stopPropagation()}>
                      {task.title}
                    </Link>
                    {task.assigneeName && (
                      <p className="mt-1 text-xs text-slate-500">{task.assigneeName}</p>
                    )}
                  </div>
                ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
