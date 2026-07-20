import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isControlPlaneAsync } from "@/lib/deployment";
import { isTenantInstallationReady } from "@/lib/installation/installation-service";

export default async function Home() {
  if (await isControlPlaneAsync()) {
    redirect("/setup");
  }

  const host = (await headers()).get("host");
  const installed = await isTenantInstallationReady(host);
  if (!installed) {
    redirect("/install/pending");
  }

  redirect("/dashboard");
}
