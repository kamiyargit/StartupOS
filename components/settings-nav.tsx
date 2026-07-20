import Link from "next/link";
import { cn } from "@/lib/utils";
import { isAdminRole } from "@/lib/deployment-client";

const baseItems = [{ href: "/settings/security", label: "امنیت حساب" }];

const adminItems = [
  { href: "/settings/app", label: "تنظیمات برنامه" },
  { href: "/settings/tasks", label: "برد وظایف" },
];

type SettingsNavProps = {
  role: string;
  pathname: string;
};

export function SettingsNav({ role, pathname }: SettingsNavProps) {
  const items = isAdminRole(role) ? [...baseItems, ...adminItems] : baseItems;

  return (
    <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-gh-border">
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href === "/settings/security" && pathname === "/settings") ||
          (item.href === "/settings/app" && pathname.startsWith("/admin/settings")) ||
          (item.href === "/settings/tasks" && pathname.startsWith("/settings/tasks"));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm transition",
              active
                ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400"
                : "text-slate-600 hover:bg-slate-100 dark:text-gh-fg-emphasis dark:hover:bg-gh-neutral",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
