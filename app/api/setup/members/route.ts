import { SetupStep } from "@/generated/control-client";
import { ensureControlPlaneDb, setupJsonError } from "@/lib/installation/setup-api";
import { requireSetupOrganizationId } from "@/lib/installation/setup-session";
import { controlPrisma } from "@/lib/prisma-control";

export async function PATCH(req: Request) {
  try {
    ensureControlPlaneDb();
    const organizationId = await requireSetupOrganizationId();
    const body = await req.json();
    const members = Array.isArray(body.members) ? body.members : [];

    await controlPrisma.organizationMemberDraft.deleteMany({ where: { organizationId } });

    if (members.length) {
      await controlPrisma.organizationMemberDraft.createMany({
        data: members.map((m: { fullName: string; email?: string; roleSuggestion?: string }) => ({
          organizationId,
          fullName: m.fullName.trim(),
          email: m.email?.trim() || null,
          roleSuggestion: m.roleSuggestion?.trim() || null,
        })),
      });
    }

    await controlPrisma.organization.update({
      where: { id: organizationId },
      data: { setupStep: SetupStep.REVIEW },
    });

    await controlPrisma.provisioningJob.updateMany({
      where: { organizationId },
      data: { currentStep: SetupStep.REVIEW },
    });

    return Response.json({ ok: true, setupStep: "REVIEW" });
  } catch (error) {
    return setupJsonError(error);
  }
}
