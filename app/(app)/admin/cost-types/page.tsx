"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Trash2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ColorPickerField } from "@/components/color-picker";
import { CostFactorTypeDTO } from "@/lib/dto";
import { pickDefaultColor } from "@/lib/cost-type-colors";

type RowDraft = { name: string; color: string };

export default function AdminCostTypesPage() {
  const [types, setTypes] = useState<CostFactorTypeDTO[]>([]);
  const [name, setName] = useState("");
  const [newColor, setNewColor] = useState(pickDefaultColor(0));
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [pendingDelete, setPendingDelete] = useState<CostFactorTypeDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () =>
    fetch("/api/cost-types")
      .then((r) => r.json())
      .then((data: CostFactorTypeDTO[]) => {
        setTypes(data);
        setDrafts({});
      });

  useEffect(() => {
    load();
  }, []);

  const getDraft = (t: CostFactorTypeDTO): RowDraft =>
    drafts[t.id] ?? { name: t.name ?? "", color: t.color ?? "#534AB7" };

  const isDirty = (t: CostFactorTypeDTO) => {
    const d = drafts[t.id];
    if (!d) return false;
    return d.name !== t.name || d.color !== t.color;
  };

  const setDraft = (id: string, patch: Partial<RowDraft>) => {
    const current = types.find((t) => t.id === id);
    if (!current) return;
    const base = drafts[id] ?? { name: current.name ?? "", color: current.color ?? "#534AB7" };
    setDrafts((prev) => ({ ...prev, [id]: { ...base, ...patch } }));
  };

  const revertDraft = (id: string) => {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const add = async () => {
    if (!name.trim()) return;
    const res = await fetch("/api/cost-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), color: newColor }),
    });
    if (!res.ok) {
      toast.error("خطا در افزودن نوع هزینه");
      return;
    }
    toast.success("نوع هزینه اضافه شد.");
    setName("");
    setNewColor(pickDefaultColor(types.length + 1));
    load();
  };

  const saveDraft = async (t: CostFactorTypeDTO) => {
    const d = drafts[t.id];
    if (!d) return;
    const res = await fetch(`/api/cost-types/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: d.name.trim(), color: d.color, isActive: t.isActive }),
    });
    if (!res.ok) {
      toast.error("خطا در ذخیره تغییرات");
      return;
    }
    toast.success("ذخیره شد.");
    load();
  };

  const toggle = async (t: CostFactorTypeDTO) => {
    const d = getDraft(t);
    await fetch(`/api/cost-types/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: d.name, color: d.color, isActive: !t.isActive }),
    });
    load();
  };

  const requestDelete = (t: CostFactorTypeDTO) => {
    if (t.expenseCount > 0) {
      toast.error("این نوع هزینه در فاکتورها استفاده شده و قابل حذف نیست.");
      return;
    }
    setPendingDelete(t);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    setDeleting(true);
    const res = await fetch(`/api/cost-types/${pendingDelete.id}`, { method: "DELETE" });
    setDeleting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "خطا در حذف نوع هزینه");
      return;
    }

    toast.success("نوع هزینه حذف شد.");
    setPendingDelete(null);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">انواع هزینه</h1>
        <p className="text-sm text-slate-500 dark:text-gh-fg-muted">مدیریت دسته‌بندی هزینه‌ها</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">افزودن نوع جدید</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="w-full min-w-0 flex-1 space-y-1 sm:min-w-[12rem]">
            <Label>نام</Label>
            <Input
              placeholder="مثلاً Host"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <ColorPickerField label="رنگ" value={newColor} onChange={setNewColor} />
          <Button onClick={add} className="w-full sm:w-auto">افزودن</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">لیست انواع</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {types.map((t) => {
            const draft = getDraft(t);
            const dirty = isDirty(t);
            return (
              <div
                key={t.id}
                className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 dark:border-gh-border sm:flex-row sm:flex-wrap sm:items-center"
                style={{
                  borderInlineStartWidth: 3,
                  borderInlineStartColor: draft.color,
                }}
              >
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <Input
                    className="w-full sm:max-w-xs"
                    value={draft.name}
                    onChange={(e) => setDraft(t.id, { name: e.target.value })}
                  />
                  <input
                    type="color"
                    value={draft.color}
                    onChange={(e) => setDraft(t.id, { color: e.target.value })}
                    className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1 dark:border-gh-border dark:bg-gh-canvas-subtle"
                    aria-label="رنگ نوع هزینه"
                  />
                  {dirty && (
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="default"
                        className="h-9 w-9 bg-primary-600 hover:bg-primary-700"
                        onClick={() => saveDraft(t)}
                        aria-label="ذخیره"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-9 w-9"
                        onClick={() => revertDraft(t.id)}
                        aria-label="لغو"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 dark:text-gh-fg-muted">فعال</span>
                  <Switch checked={t.isActive} onCheckedChange={() => toggle(t)} />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-gh-danger dark:hover:bg-red-950/40"
                    onClick={() => requestDelete(t)}
                    disabled={t.expenseCount > 0}
                    title={
                      t.expenseCount > 0
                        ? `در ${t.expenseCount} فاکتور استفاده شده`
                        : "حذف نوع هزینه"
                    }
                    aria-label="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف نوع هزینه</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 dark:text-gh-fg-emphasis">
            آیا از حذف «{pendingDelete?.name}» مطمئن هستید؟ این عمل قابل بازگشت نیست.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
            >
              انصراف
            </Button>
            <Button
              type="button"
              variant="default"
              className="bg-red-600 hover:bg-red-700"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? "در حال حذف..." : "حذف"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
