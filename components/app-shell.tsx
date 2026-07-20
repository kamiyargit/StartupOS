"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState, type ComponentType } from "react";
import {
  LayoutDashboard,
  Receipt,
  Users,
  Tags,
  Settings,
  PlusCircle,
  FileText,
  Menu,
  X,
  CheckSquare,
  TrendingUp,
  BarChart3,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isAdminRole } from "@/lib/deployment-client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppLogo } from "@/components/app-logo";
import { useAppSettings } from "@/components/app-settings-provider";

type AppShellProps = {
  children: React.ReactNode;
  user: {
    fullName: string;
    role: string;
    avatarUrl?: string | null;
  };
};

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const moduleItems: NavItem[] = [
  { href: "/dashboard", label: "خانه", icon: LayoutDashboard },
  { href: "/expenses", label: "هزینه‌ها", icon: Receipt },
  { href: "/expenses/new", label: "ثبت هزینه", icon: PlusCircle },
  { href: "/meeting-minutes", label: "صورتجلسات", icon: FileText },
  { href: "/tasks", label: "وظایف", icon: CheckSquare },
  { href: "/income", label: "درآمد", icon: TrendingUp },
  { href: "/analytics", label: "تحلیل", icon: BarChart3 },
];

const adminItems: NavItem[] = [
  { href: "/meeting-minutes/new", label: "ثبت صورتجلسه", icon: PlusCircle },
  { href: "/admin/users", label: "کاربران", icon: Users },
  { href: "/admin/cost-types", label: "انواع هزینه", icon: Tags },
];

const settingsItem: NavItem = { href: "/settings", label: "تنظیمات", icon: Settings };

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: NavItem & { active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
        active
          ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400"
          : "text-slate-600 hover:bg-slate-100 dark:text-gh-fg-emphasis dark:hover:bg-gh-neutral",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

function NavSection({
  title,
  items,
  activeHref,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  activeHref: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-1">
      <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-gh-fg-muted">
        {title}
      </p>
      {items.map((item) => (
        <NavLink key={item.href} {...item} active={item.href === activeHref} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { appNameFa, logoUrl } = useAppSettings();
  const isAdmin = isAdminRole(user.role);
  const allItems = isAdmin
    ? [...moduleItems, ...adminItems, settingsItem]
    : [...moduleItems, settingsItem];

  const activeHref =
    [...allItems]
      .filter((item) => {
        if (item.href === "/settings") {
          return (
            pathname === "/settings" ||
            pathname.startsWith("/settings/") ||
            pathname.startsWith("/admin/settings")
          );
        }
        if (item.href === "/dashboard") {
          return pathname === "/dashboard";
        }
        return pathname === item.href || pathname.startsWith(`${item.href}/`);
      })
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? "";

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="pwa-shell flex min-h-screen flex-col bg-slate-50 dark:bg-gh-canvas">
      <header className="sticky top-0 z-40 shrink-0 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-gh-border dark:bg-gh-canvas-subtle/90">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4 sm:h-16">
          <div className="flex min-w-0 items-center gap-2 sm:gap-6">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? "بستن منو" : "باز کردن منو"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
              {logoUrl ? (
                <AppLogo src={logoUrl} size={28} className="h-7 w-7 rounded" />
              ) : null}
              <span className="truncate text-base font-bold text-primary-700 dark:text-primary-400 sm:text-lg">
                {appNameFa}
              </span>
            </Link>
            <nav className="hidden items-center gap-1 lg:flex">
              <NavSection title="ماژول‌ها" items={moduleItems} activeHref={activeHref} />
              {isAdmin && (
                <div className="ms-2 border-s border-slate-200 ps-2 dark:border-gh-border">
                  <NavSection title="مدیریت" items={adminItems} activeHref={activeHref} />
                </div>
              )}
              <div className="ms-2 border-s border-slate-200 ps-2 dark:border-gh-border">
                <NavLink {...settingsItem} active={settingsItem.href === activeHref} />
              </div>
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <span className="hidden max-w-[8rem] truncate text-sm text-slate-600 dark:text-gh-fg-muted md:inline lg:max-w-none">
              {user.fullName}
            </span>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4" />
              خروج
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              onClick={() => signOut({ callbackUrl: "/login" })}
              aria-label="خروج"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 top-14 z-30 bg-black/40 lg:hidden sm:top-16"
              onClick={closeMobile}
              aria-label="بستن منو"
            />
            <nav className="absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-slate-200 bg-white p-3 shadow-lg dark:border-gh-border dark:bg-gh-canvas-subtle sm:max-h-[calc(100dvh-4rem)] lg:hidden">
              <div className="flex flex-col gap-4">
                <NavSection title="ماژول‌ها" items={moduleItems} activeHref={activeHref} onNavigate={closeMobile} />
                {isAdmin && (
                  <NavSection title="مدیریت" items={adminItems} activeHref={activeHref} onNavigate={closeMobile} />
                )}
                <NavSection title="سیستم" items={[settingsItem]} activeHref={activeHref} onNavigate={closeMobile} />
                <div className="border-t border-slate-200 pt-2 text-sm text-slate-600 dark:border-gh-border dark:text-gh-fg-muted">
                  {user.fullName}
                </div>
              </div>
            </nav>
          </>
        )}
      </header>
      <main className="pwa-shell-scroll mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
