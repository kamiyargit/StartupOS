import Link from "next/link";
import { cn } from "@/lib/utils";

const baseItems = [{ href: "/settings/security", label: "امنیت حساب" }];

const adminItem = { href: "/settings/app", label: "تنظیمات برنامه" };

type SettingsNavProps = {
  role: string;
  pathname: string;
};

export function SettingsNav({ role, pathname }: SettingsNavProps) {
  const items = role === "ADMIN" ? [...baseItems, adminItem] : baseItems;

  return (
    <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-gh-border">
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href === "/settings/security" && pathname === "/settings") ||
          (item.href === "/settings/app" && pathname.startsWith("/admin/settings"));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm transition",
              active
                ? "bg-emerald-50 text-emerald-700 dark:bg-[#033a16] dark:text-gh-success"
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
