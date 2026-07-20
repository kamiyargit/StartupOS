"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_BOARD_COLUMNS } from "@/lib/task-mapper";

const DEFAULT_LABELS: Record<string, string> = {
  todo: "انجام نشده",
  in_progress: "در حال انجام",
  review: "بررسی",
  done: "انجام شده",
};

export default function TaskBoardSettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [boardName, setBoardName] = useState("Default Board");
  const [columns, setColumns] = useState<string[]>([...DEFAULT_BOARD_COLUMNS]);
  const [labels, setLabels] = useState<Record<string, string>>({ ...DEFAULT_LABELS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (session?.user?.role !== "ADMIN") {
      router.replace("/settings/security");
      return;
    }

    fetch("/api/task-boards")
      .then((r) => r.json())
      .then((data) => {
        const cols: string[] = data.columns ?? [...DEFAULT_BOARD_COLUMNS];
        setBoardName(data.name ?? "Default Board");
        setColumns(cols);
        setLabels((prev) => {
          const next = { ...DEFAULT_LABELS, ...prev, ...(data.columnLabels ?? {}) };
          for (const col of cols) {
            if (!next[col]) next[col] = col.replace(/_/g, " ");
          }
          return next;
        });
      })
      .finally(() => setLoading(false));
  }, [session, router]);

  const updateColumn = (index: number, value: string) => {
    setColumns((prev) => prev.map((col, i) => (i === index ? value : col)));
  };

  const updateLabel = (key: string, value: string) => {
    setLabels((prev) => ({ ...prev, [key]: value }));
  };

  const addColumn = () => {
    if (columns.length >= 8) return;
    const key = `column_${columns.length + 1}`;
    setColumns((prev) => [...prev, key]);
    setLabels((prev) => ({ ...prev, [key]: `ستون ${columns.length + 1}` }));
  };

  const removeColumn = (index: number) => {
    if (columns.length <= 2) {
      toast.error("حداقل دو ستون لازم است.");
      return;
    }
    setColumns((prev) => prev.filter((_, i) => i !== index));
  };

  const save = async () => {
    setSaving(true);
    try {
      const columnLabelsPayload = Object.fromEntries(
        columns.map((col) => [col, labels[col]?.trim() || col.replace(/_/g, " ")]),
      );
      const res = await fetch("/api/task-boards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: boardName, columns, columnLabels: columnLabelsPayload }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "ذخیره ناموفق بود");
        return;
      }
      toast.success("تنظیمات برد ذخیره شد.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">در حال بارگذاری...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">تنظیمات برد وظایف</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="board-name">نام برد</Label>
          <Input id="board-name" value={boardName} onChange={(e) => setBoardName(e.target.value)} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>ستون‌های کانبان</Label>
            <Button type="button" variant="outline" size="sm" onClick={addColumn} disabled={columns.length >= 8}>
              <Plus className="h-4 w-4" />
              افزودن ستون
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            شناسه ستون باید انگلیسی باشد (مثلاً <code dir="ltr">in_progress</code>). برچسب فارسی فقط برای نمایش است.
          </p>
          {columns.map((col, index) => (
            <div key={`${col}-${index}`} className="grid gap-2 rounded-lg border border-slate-200 p-3 dark:border-gh-border sm:grid-cols-[1fr_1fr_auto]">
              <div className="space-y-1">
                <Label className="text-xs">شناسه</Label>
                <Input value={col} dir="ltr" onChange={(e) => updateColumn(index, e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">برچسب نمایشی</Label>
                <Input value={labels[col] ?? col} onChange={(e) => updateLabel(col, e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button type="button" variant="outline" size="icon" onClick={() => removeColumn(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Button onClick={save} disabled={saving}>
          {saving ? "در حال ذخیره..." : "ذخیره تنظیمات برد"}
        </Button>
      </CardContent>
    </Card>
  );
}
