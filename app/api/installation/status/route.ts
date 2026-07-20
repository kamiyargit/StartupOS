import { headers } from "next/headers";
import { jsonError } from "@/lib/auth-helpers";
import { isControlPlaneForHost, isUnifiedDev, resolvePlaneFromHost } from "@/lib/deployment";
import { getTenantInstallationState, isTenantInstallationReady } from "@/lib/installation/installation-service";

export async function GET() {
  try {
    const host = isUnifiedDev() ? (await headers()).get("host") : null;
    if (isUnifiedDev() ? resolvePlaneFromHost(host) === "control" : isControlPlaneForHost(host)) {
      return Response.json({ plane: "control", installed: true });
    }
    const [state, installed] = await Promise.all([
      getTenantInstallationState(host),
      isTenantInstallationReady(host),
    ]);
    return Response.json({ plane: "tenant", installed, ...state });
  } catch (error) {
    return jsonError(error);
  }
}
