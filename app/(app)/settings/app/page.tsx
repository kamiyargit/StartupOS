import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AppSettingsPanel from "./app-settings-panel";

export default async function AppSettingsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    redirect("/settings/security");
  }

  return <AppSettingsPanel />;
}
