import { redirect } from "next/navigation";

export default function LegacyAdminSettingsPage() {
  redirect("/settings/app");
}
