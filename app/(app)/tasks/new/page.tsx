"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DualDatePicker } from "@/components/dual-date-picker";
import { UserDTO } from "@/lib/dto";
import { toGregorianString } from "@/lib/dates";

export default function NewTaskPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [labels, setLabels] = useState<{ id: string; name: string; color: string }[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [ackUsers, setAckUsers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([fetch("/api/users?all=true"), fetch("/api/task-meta")]).then(async ([u, m]) => {
      setUsers(await u.json());
      const meta = await m.json();
      setCategories(meta.categories ?? []);
      setLabels(meta.labels ?? []);
    });
  }, []);

  const toggleLabel = (id: string) => {
    setSelectedLabels((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleAck = (id: string) => {
    setAckUsers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        priority,
        assigneeId: assigneeId || null,
        categoryId: categoryId || null,
        dueDate: dueDate ? toGregorianString(dueDate) : null,
        labelIds: selectedLabels,
        acknowledgementUserIds: ackUsers,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("خطا در ایجاد وظیفه");
      return;
    }
    toast.success("وظیفه ایجاد شد.");
    router.push("/tasks");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">وظیفه جدید</h1>
        <Button variant="outline" asChild>
          <Link href="/tasks">انصراف</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">اطلاعات وظیفه</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>عنوان *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>توضیحات</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>اولویت</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">کم</SelectItem>
                  <SelectItem value="MEDIUM">متوسط</SelectItem>
                  <SelectItem value="HIGH">بالا</SelectItem>
                  <SelectItem value="URGENT">فوری</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>مسئول</Label>
              <Select value={assigneeId || "none"} onValueChange={(v) => setAssigneeId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="انتخاب" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {categories.length > 0 && (
            <div className="space-y-1">
              <Label>دسته</Label>
              <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label>سررسید</Label>
            <DualDatePicker value={dueDate} onChange={setDueDate} />
          </div>
          {labels.length > 0 && (
            <div className="space-y-2">
              <Label>برچسب‌ها</Label>
              <div className="flex flex-wrap gap-2">
                {labels.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => toggleLabel(l.id)}
                    className={`rounded-full px-2.5 py-1 text-xs ${selectedLabels.includes(l.id) ? "ring-2 ring-primary-500" : ""}`}
                    style={{ backgroundColor: `${l.color}22`, color: l.color }}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>تأییدکنندگان (شرکا)</Label>
            <div className="flex flex-wrap gap-2">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleAck(u.id)}
                  className={`rounded-lg border px-2 py-1 text-xs ${ackUsers.includes(u.id) ? "border-primary-500 bg-primary-50" : "border-slate-200"}`}
                >
                  {u.fullName}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={save} disabled={saving || !title.trim()} className="w-full">
            {saving ? "در حال ذخیره..." : "ایجاد وظیفه"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
