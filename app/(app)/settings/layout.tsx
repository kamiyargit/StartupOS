import { auth } from "@/auth";
import { SettingsNavClient } from "@/components/settings-nav-client";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">تنظیمات</h1>
        <p className="text-sm text-slate-500 dark:text-gh-fg-muted">مدیریت تنظیمات حساب و برنامه</p>
      </div>
      <SettingsNavClient role={session?.user?.role ?? "USER"} />
      {children}
    </div>
  );
}
