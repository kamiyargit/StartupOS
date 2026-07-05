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
  LogOut,
  PlusCircle,
  FileText,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

type AppShellProps = {
  children: React.ReactNode;
  user: {
    fullName: string;
    role: string;
    avatarUrl?: string | null;
  };
};

const navItems = [
  { href: "/dashboard", label: "داشبورد", icon: LayoutDashboard },
  { href: "/expenses", label: "هزینه‌ها", icon: Receipt },
  { href: "/expenses/new", label: "ثبت هزینه", icon: PlusCircle },
  { href: "/meeting-minutes", label: "صورتجلسات", icon: FileText },
];

const settingsItem = { href: "/settings", label: "تنظیمات", icon: Settings };

const adminMeetingMinutesItem = {
  href: "/meeting-minutes/new",
  label: "ثبت صورتجلسه",
  icon: PlusCircle,
};

const adminItems = [
  { href: "/admin/users", label: "کاربران", icon: Users },
  { href: "/admin/cost-types", label: "انواع هزینه", icon: Tags },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
        active
          ? "bg-emerald-50 text-emerald-700 dark:bg-[#033a16] dark:text-gh-success"
          : "text-slate-600 hover:bg-slate-100 dark:text-gh-fg-emphasis dark:hover:bg-gh-neutral",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items =
    user.role === "ADMIN"
      ? [...navItems, adminMeetingMinutesItem, ...adminItems, settingsItem]
      : [...navItems, settingsItem];
  const activeHref =
    [...items]
      .filter((item) => {
        if (item.href === "/settings") {
          return (
            pathname === "/settings" ||
            pathname.startsWith("/settings/") ||
            pathname.startsWith("/admin/settings")
          );
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
          <div className="flex min-w-0 items-center gap-2 sm:gap-8">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? "بستن منو" : "باز کردن منو"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Link
              href="/dashboard"
              className="truncate text-base font-bold text-emerald-700 dark:text-gh-success sm:text-lg"
            >
              پنل کیوتی
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {items.map((item) => (
                <NavLink
                  key={item.href}
                  {...item}
                  active={item.href === activeHref}
                />
              ))}
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
              className="fixed inset-0 top-14 z-30 bg-black/40 md:hidden sm:top-16"
              onClick={closeMobile}
              aria-label="بستن منو"
            />
            <nav className="absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-slate-200 bg-white p-3 shadow-lg dark:border-gh-border dark:bg-gh-canvas-subtle sm:max-h-[calc(100dvh-4rem)] md:hidden">
              <div className="flex flex-col gap-1">
                {items.map((item) => (
                  <NavLink
                    key={item.href}
                    {...item}
                    active={item.href === activeHref}
                    onNavigate={closeMobile}
                  />
                ))}
                <div className="mt-2 border-t border-slate-200 pt-2 text-sm text-slate-600 dark:border-gh-border dark:text-gh-fg-muted md:hidden">
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
