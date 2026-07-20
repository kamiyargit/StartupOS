import { SetupStep } from "@/generated/control-client";
import { ensureControlPlaneDb, setupJsonError } from "@/lib/installation/setup-api";
import { requireSetupOrganizationId } from "@/lib/installation/setup-session";
import { controlPrisma } from "@/lib/prisma-control";

export async function PATCH(req: Request) {
  try {
    ensureControlPlaneDb();
    const organizationId = await requireSetupOrganizationId();
    const body = await req.json();

    if (!body.name?.trim()) {
      return Response.json({ error: "نام سازمان الزامی است." }, { status: 400 });
    }

    const org = await controlPrisma.organization.update({
      where: { id: organizationId },
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        businessType: body.businessType?.trim() || null,
        companyInfo: body.companyInfo ?? null,
        setupStep: SetupStep.TEAM,
      },
    });

    await controlPrisma.provisioningJob.updateMany({
      where: { organizationId },
      data: { currentStep: SetupStep.TEAM },
    });

    return Response.json({ ok: true, setupStep: org.setupStep });
  } catch (error) {
    return setupJsonError(error);
  }
}
