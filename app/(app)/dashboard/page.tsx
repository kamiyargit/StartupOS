"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Receipt,
  FileText,
  CheckSquare,
  TrendingUp,
  BarChart3,
  Settings,
  Users,
  Tags,
  PlusCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAppSettings } from "@/components/app-settings-provider";
import { cn } from "@/lib/utils";
import { isAdminRole } from "@/lib/deployment-client";

type ModuleItem = {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

const modules: ModuleItem[] = [
  { href: "/expenses", label: "هزینه‌ها", description: "ثبت و مدیریت فاکتورها", icon: Receipt },
  { href: "/meeting-minutes", label: "صورتجلسات", description: "آرشیو جلسات هیئت‌مدیره", icon: FileText },
  { href: "/tasks", label: "مدیریت وظایف", description: "برد کانبان و صف کار", icon: CheckSquare },
  { href: "/income", label: "درآمد", description: "منابع درآمد و فاکتورها", icon: TrendingUp },
  { href: "/analytics", label: "تحلیل مالی", description: "نمودارها و گزارش‌ها", icon: BarChart3 },
  { href: "/settings", label: "تنظیمات", description: "امنیت و پیکربندی", icon: Settings },
];

const adminModules: ModuleItem[] = [
  { href: "/admin/users", label: "کاربران", description: "مدیریت کاربران", icon: Users, adminOnly: true },
  { href: "/admin/cost-types", label: "انواع هزینه", description: "دسته‌بندی هزینه‌ها", icon: Tags, adminOnly: true },
  { href: "/meeting-minutes/new", label: "ثبت صورتجلسه", description: "ایجاد صورتجلسه جدید", icon: PlusCircle, adminOnly: true },
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const { appNameFa, tagline, loading } = useAppSettings();
  const isAdmin = isAdminRole(session?.user?.role ?? "");
  const items = isAdmin ? [...modules, ...adminModules] : modules;

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-2 flex items-center gap-2 text-primary-700 dark:text-primary-400">
          <LayoutDashboard className="h-6 w-6" />
          <h1 className="text-xl font-bold sm:text-2xl">
            {loading ? "..." : appNameFa}
          </h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-gh-fg-muted">
          {tagline ?? "سیستم مدیریت هوشمند کسب‌وکار"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card
              className={cn(
                "h-full transition hover:border-primary-400 hover:shadow-md dark:hover:border-primary-600",
                item.adminOnly && "border-dashed",
              )}
            >
              <CardContent className="flex items-start gap-4 p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400">
                  <item.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold">{item.label}</p>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-gh-fg-muted">
                    {item.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
