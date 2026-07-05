"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserDTO } from "@/lib/dto";

const emptyForm = {
  username: "",
  email: "",
  password: "",
  fullName: "",
  phone: "",
  position: "",
  role: "USER" as "ADMIN" | "USER",
  isActive: true,
  isFinancier: false,
  sharePercent: "0",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const load = () => fetch("/api/users").then((r) => r.json()).then(setUsers);

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    const url = editId ? `/api/users/${editId}` : "/api/users";
    const method = editId ? "PATCH" : "POST";
    const body = { ...form };
    if (editId && !body.password) delete (body as { password?: string }).password;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      toast.error("خطا در ذخیره کاربر");
      return;
    }

    toast.success(editId ? "کاربر به‌روزرسانی شد." : "کاربر ایجاد شد.");
    setOpen(false);
    setEditId(null);
    setForm(emptyForm);
    load();
  };

  const startEdit = (u: UserDTO) => {
    setEditId(u.id);
    setForm({
      username: u.username,
      email: u.email,
      password: "",
      fullName: u.fullName,
      phone: u.phone ?? "",
      position: u.position ?? "",
      role: u.role,
      isActive: u.isActive,
      isFinancier: u.isFinancier,
      sharePercent: u.sharePercent ?? "0",
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">مدیریت کاربران</h1>
          <p className="text-sm text-slate-500 dark:text-gh-fg-muted">افزودن و ویرایش کاربران</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditId(null);
                setForm(emptyForm);
              }}
            >
              کاربر جدید
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "ویرایش کاربر" : "کاربر جدید"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-1">
                <Label>نام کاربری</Label>
                <Input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>ایمیل</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>{editId ? "رمز عبور جدید (اختیاری)" : "رمز عبور"}</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>نام کامل</Label>
                <Input
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>تلفن</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>سمت سازمانی</Label>
                <Input
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>نقش</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v as "ADMIN" | "USER" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">کاربر</SelectItem>
                    <SelectItem value="ADMIN">مدیر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>فعال</Label>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>تامین‌کننده هزینه</Label>
                <Switch
                  checked={form.isFinancier}
                  onCheckedChange={(v) =>
                    setForm({ ...form, isFinancier: v, sharePercent: v ? form.sharePercent : "0" })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>درصد سهم</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.sharePercent}
                  disabled={!form.isFinancier}
                  onChange={(e) => setForm({ ...form, sharePercent: e.target.value })}
                />
              </div>
              <Button onClick={save}>ذخیره</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">لیست کاربران</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 md:hidden">
            {users.map((u) => (
              <div
                key={u.id}
                className="rounded-lg border border-slate-200 p-4 dark:border-gh-border"
              >
                <p className="font-medium">{u.fullName}</p>
                <p className="text-sm text-slate-500 dark:text-gh-fg-muted">{u.email}</p>
                <dl className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500 dark:text-gh-fg-muted">سمت</dt>
                    <dd>{u.position ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500 dark:text-gh-fg-muted">نقش</dt>
                    <dd>{u.role === "ADMIN" ? "مدیر" : "کاربر"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500 dark:text-gh-fg-muted">وضعیت</dt>
                    <dd>{u.isActive ? "فعال" : "غیرفعال"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500 dark:text-gh-fg-muted">تامین‌کننده</dt>
                    <dd>{u.isFinancier ? `بله (${u.sharePercent}%)` : "خیر"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500 dark:text-gh-fg-muted">۲FA</dt>
                    <dd>{u.twoFactorEnabled ? "فعال" : "خیر"}</dd>
                  </div>
                </dl>
                <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => startEdit(u)}>
                  ویرایش
                </Button>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-slate-500 dark:text-gh-fg-muted">
                <th className="py-2 text-start">نام</th>
                <th className="py-2 text-start">ایمیل</th>
                <th className="py-2 text-start">سمت</th>
                <th className="py-2 text-start">نقش</th>
                <th className="py-2 text-start">وضعیت</th>
                <th className="py-2 text-start">تامین‌کننده/سهم</th>
                <th className="py-2 text-start">۲FA</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b dark:border-gh-border">
                  <td className="py-2">{u.fullName}</td>
                  <td className="py-2">{u.email}</td>
                  <td className="py-2">{u.position ?? "—"}</td>
                  <td className="py-2">{u.role === "ADMIN" ? "مدیر" : "کاربر"}</td>
                  <td className="py-2">{u.isActive ? "فعال" : "غیرفعال"}</td>
                  <td className="py-2">{u.isFinancier ? `${u.sharePercent}%` : "خیر"}</td>
                  <td className="py-2">{u.twoFactorEnabled ? "فعال" : "خیر"}</td>
                  <td className="py-2">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(u)}>
                      ویرایش
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
