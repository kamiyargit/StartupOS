import { SetupStep } from "@/generated/control-client";
import { ensureControlPlaneDb, setupJsonError } from "@/lib/installation/setup-api";
import { reserveSlug } from "@/lib/installation/provisioning-service";
import { validateSlug } from "@/lib/installation/slug";
import { requireSetupOrganizationId } from "@/lib/installation/setup-session";
import { getBaseDomain } from "@/lib/deployment";
import { controlPrisma } from "@/lib/prisma-control";

const BUSINESS_TYPES = [
  "استارتاپ",
  "فروشگاه",
  "خدمات",
  "تولیدی",
  "آژانس",
  "سایر",
] as const;

export async function PATCH(req: Request) {
  try {
    ensureControlPlaneDb();
    const organizationId = await requireSetupOrganizationId();
    const body = await req.json();

    const name = body.name?.trim();
    const businessType = body.businessType?.trim() || null;
    const slugInput = body.slug?.trim();

    if (!name) {
      return Response.json({ error: "نام کسب‌وکار الزامی است." }, { status: 400 });
    }

    if (businessType && !BUSINESS_TYPES.includes(businessType as (typeof BUSINESS_TYPES)[number])) {
      return Response.json({ error: "نوع فعالیت نامعتبر است." }, { status: 400 });
    }

    if (!slugInput) {
      return Response.json({ error: "زیردامنه الزامی است." }, { status: 400 });
    }

    const validated = validateSlug(slugInput);
    if (!validated.ok) {
      return Response.json({ error: validated.error }, { status: 400 });
    }

    await reserveSlug(organizationId, validated.slug);

    const org = await controlPrisma.organization.update({
      where: { id: organizationId },
      data: {
        name,
        businessType,
        slug: validated.slug,
        setupStep: SetupStep.TEAM,
      },
    });

    await controlPrisma.provisioningJob.updateMany({
      where: { organizationId },
      data: { currentStep: SetupStep.TEAM },
    });

    return Response.json({
      ok: true,
      setupStep: org.setupStep,
      slug: validated.slug,
      preview: `${validated.slug}.${getBaseDomain()}`,
    });
  } catch (error) {
    return setupJsonError(error);
  }
}

export async function GET() {
  return Response.json({ businessTypes: BUSINESS_TYPES });
}
