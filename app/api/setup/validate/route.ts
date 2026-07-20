import { ensureControlPlaneDb, setupJsonError } from "@/lib/installation/setup-api";
import { requireSetupOrganizationId } from "@/lib/installation/setup-session";
import { runInstallationValidation } from "@/lib/installation/validation-service";
import { controlPrisma } from "@/lib/prisma-control";

export async function GET() {
  try {
    ensureControlPlaneDb();
    const organizationId = await requireSetupOrganizationId();
    const org = await controlPrisma.organization.findUnique({
      where: { id: organizationId },
      include: { reservations: true },
    });
    const slug = org?.reservations[0]?.slug ?? org?.slug ?? undefined;
    const validation = await runInstallationValidation(slug);
    return Response.json(validation);
  } catch (error) {
    return setupJsonError(error);
  }
}
