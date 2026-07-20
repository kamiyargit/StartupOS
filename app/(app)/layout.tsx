import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <AppShell
      user={{
        fullName: session.user.name ?? session.user.username,
        role: session.user.role,
        avatarUrl: session.user.avatarUrl,
      }}
    >
      {children}
    </AppShell>
  );
}
