import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { AppSettingsProvider } from "@/components/app-settings-provider";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <AppSettingsProvider>
      <AppShell
        user={{
          fullName: session.user.name ?? session.user.username,
          role: session.user.role,
          avatarUrl: session.user.avatarUrl,
        }}
      >
        {children}
      </AppShell>
    </AppSettingsProvider>
  );
}
