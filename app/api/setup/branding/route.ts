import { SetupStep } from "@/generated/control-client";
import { ensureControlPlaneDb, setupJsonError } from "@/lib/installation/setup-api";
import { requireSetupOrganizationId } from "@/lib/installation/setup-session";
import { controlPrisma } from "@/lib/prisma-control";

export async function PATCH(req: Request) {
  try {
    ensureControlPlaneDb();
    const organizationId = await requireSetupOrganizationId();
    const body = await req.json();

    const appName = body.appName?.trim() || "Kartin";
    const appNameShort = body.appNameShort?.trim() || appName;
    const appNameFa = body.appNameFa?.trim() || "کارتین";

    await controlPrisma.brandingDraft.upsert({
      where: { organizationId },
      update: {
        appName,
        appNameShort,
        appNameFa,
        tagline: body.tagline?.trim() || null,
        logoUrl: body.logoUrl ?? null,
        iconUrl: body.iconUrl ?? null,
        themeColor: body.themeColor?.trim() || "#534AB7",
      },
      create: {
        organizationId,
        appName,
        appNameShort,
        appNameFa,
        tagline: body.tagline?.trim() || null,
        logoUrl: body.logoUrl ?? null,
        iconUrl: body.iconUrl ?? null,
        themeColor: body.themeColor?.trim() || "#534AB7",
      },
    });

    await controlPrisma.organization.update({
      where: { id: organizationId },
      data: { setupStep: SetupStep.REVIEW },
    });

    return Response.json({ ok: true, setupStep: SetupStep.REVIEW });
  } catch (error) {
    return setupJsonError(error);
  }
}
