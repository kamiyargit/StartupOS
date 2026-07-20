import bcrypt from "bcryptjs";
import { SetupStep } from "@/generated/control-client";
import { ensureControlPlaneDb, setupJsonError } from "@/lib/installation/setup-api";
import { createSetupSession } from "@/lib/installation/setup-session";
import { controlPrisma } from "@/lib/prisma-control";

export async function POST() {
  try {
    ensureControlPlaneDb();

    const org = await controlPrisma.organization.create({
      data: { name: "", status: "DRAFT", setupStep: SetupStep.ACCOUNT },
    });

    await controlPrisma.provisioningJob.create({
      data: { organizationId: org.id, status: "DRAFT", currentStep: SetupStep.ACCOUNT },
    });

    await createSetupSession(org.id);

    return Response.json({ organizationId: org.id }, { status: 201 });
  } catch (error) {
    return setupJsonError(error);
  }
}
