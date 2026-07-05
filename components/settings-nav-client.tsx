"use client";

import { usePathname } from "next/navigation";
import { SettingsNav } from "@/components/settings-nav";

export function SettingsNavClient({ role }: { role: string }) {
  const pathname = usePathname();
  return <SettingsNav role={role} pathname={pathname} />;
}
