"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Search, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Pagination } from "@/components/pagination";
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
import { Role } from "@prisma/client";
import { PaginatedResponse, UserDTO } from "@/lib/dto";
import { cn } from "@/lib/utils";
import { isAdminRole } from "@/lib/deployment-client";

function roleLabel(user: UserDTO) {
  if (user.role === "SUPER_ADMIN" || user.isSuperAdmin) return "مدیر ارشد";
  if (user.role === "ADMIN") return "مدیر";
  return "کاربر";
}

function isProtectedSuperAdmin(user: UserDTO) {
  return user.role === "SUPER_ADMIN" || user.isSuperAdmin === true;
}

const emptyForm = {
  username: "",
  email: "",
  password: "",
  fullName: "",
  phone: "",
  position: "",
  role: "USER" as Role,
  isActive: true,
  isFinancier: false,
  sharePercent: "0",
};

function userInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function UserAvatar({ user }: { user: UserDTO }) {
  if (user.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={user.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
    );
  }
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-800 dark:bg-primary-950 dark:text-primary-400">
      {userInitials(user.fullName)}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        active
          ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400"
          : "bg-slate-100 text-slate-600 dark:bg-gh-neutral dark:text-gh-fg-muted",
      )}
    >
      {active ? "فعال" : "غیرفعال"}
    </span>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);

  const load = useCallback(
    (targetPage = page) => {
      const params = new URLSearchParams({ page: String(targetPage), pageSize: String(pageSize) });
      if (q) params.set("q", q);
      if (roleFilter !== "all") params.set("role", roleFilter);
      fetch(`/api/users?${params}`)
        .then((r) => r.json())
        .then((data: PaginatedResponse<UserDTO>) => {
          setUsers(data.items ?? []);
          setTotal(data.total ?? 0);
          setTotalPages(data.totalPages ?? 1);
          setPage(data.page ?? targetPage);
        });
    },
    [page, pageSize, q, roleFilter],
  );

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "خطا در ذخیره کاربر");
      return;
    }

    toast.success(editId ? "کاربر به‌روزرسانی شد." : "کاربر ایجاد شد.");
    setOpen(false);
    setEditId(null);
    setForm(emptyForm);
    load(page);
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

  const onSearch = () => {
    setPage(1);
    load(1);
  };

  const editingUser = editId ? users.find((u) => u.id === editId) : null;
  const superAdminLocked = editingUser ? isProtectedSuperAdmin(editingUser) : false;

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
                  disabled={superAdminLocked}
                  onValueChange={(v) => setForm({ ...form, role: v as Role })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">کاربر</SelectItem>
                    <SelectItem value="ADMIN">مدیر</SelectItem>
                    {superAdminLocked && <SelectItem value="SUPER_ADMIN">مدیر ارشد</SelectItem>}
                  </SelectContent>
                </Select>
                {superAdminLocked && (
                  <p className="text-xs text-slate-500">نقش مدیر ارشد قابل تغییر نیست.</p>
                )}
              </div>
              <div className="flex items-center justify-between">
                <Label>فعال</Label>
                <Switch
                  checked={form.isActive}
                  disabled={superAdminLocked}
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
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="ps-9"
                placeholder="جستجو نام، ایمیل، سمت..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSearch()}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه نقش‌ها</SelectItem>
                <SelectItem value="ADMIN">مدیر</SelectItem>
                <SelectItem value="USER">کاربر</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={onSearch} className="w-full sm:w-auto">
              جستجو
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 md:hidden">
            {users.map((u) => (
              <div
                key={u.id}
                className="rounded-lg border border-slate-200 p-4 dark:border-gh-border"
              >
                <div className="flex items-start gap-3">
                  <UserAvatar user={u} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{u.fullName}</p>
                    {u.position && (
                      <p className="text-sm text-slate-500 dark:text-gh-fg-muted">{u.position}</p>
                    )}
                    <p className="mt-1 text-xs text-slate-400">{u.email}</p>
                  </div>
                  <StatusBadge active={u.isActive} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-gh-neutral">
                    {roleLabel(u)}
                  </span>
                  {u.isFinancier && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-[#051d4d] dark:text-blue-300">
                      تامین‌کننده {u.sharePercent}%
                    </span>
                  )}
                  {u.twoFactorEnabled && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-700 dark:bg-primary-950 dark:text-primary-400">
                      <ShieldCheck className="h-3 w-3" />
                      ۲FA
                    </span>
                  )}
                </div>
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
                  <th className="py-2 text-start">کاربر</th>
                  <th className="py-2 text-start">ایمیل</th>
                  <th className="py-2 text-start">نقش</th>
                  <th className="py-2 text-start">وضعیت</th>
                  <th className="py-2 text-start">تامین‌کننده</th>
                  <th className="py-2 text-start">۲FA</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b dark:border-gh-border">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar user={u} />
                        <div>
                          <p className="font-medium">{u.fullName}</p>
                          <p className="text-xs text-slate-500 dark:text-gh-fg-muted">
                            {u.position ?? "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">{u.email}</td>
                    <td className="py-3">{roleLabel(u)}</td>
                    <td className="py-3">
                      <StatusBadge active={u.isActive} />
                    </td>
                    <td className="py-3">{u.isFinancier ? `${u.sharePercent}%` : "خیر"}</td>
                    <td className="py-3">{u.twoFactorEnabled ? "فعال" : "خیر"}</td>
                    <td className="py-3">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(u)}>
                        ویرایش
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={(p) => load(p)}
            className="mt-4"
          />
        </CardContent>
      </Card>
    </div>
  );
}
