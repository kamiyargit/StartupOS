import { SetupStep } from "@/generated/control-client";
import { ensureControlPlaneDb, setupJsonError } from "@/lib/installation/setup-api";
import { checkSlugAvailable, reserveSlug } from "@/lib/installation/provisioning-service";
import { validateSlug } from "@/lib/installation/slug";
import { requireSetupOrganizationId } from "@/lib/installation/setup-session";
import { getBaseDomain } from "@/lib/deployment";
import { controlPrisma } from "@/lib/prisma-control";

export async function GET(req: Request) {
  try {
    ensureControlPlaneDb();
    const { searchParams } = new URL(req.url);
    const slugInput = searchParams.get("slug") ?? "";
    const organizationId = searchParams.get("organizationId") ?? undefined;

    const validated = validateSlug(slugInput);
    if (!validated.ok) {
      return Response.json({ available: false, error: validated.error, slug: slugInput });
    }

    const available = await checkSlugAvailable(validated.slug, organizationId);
    return Response.json({
      available,
      slug: validated.slug,
      preview: `${validated.slug}.${getBaseDomain()}`,
    });
  } catch (error) {
    return setupJsonError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    ensureControlPlaneDb();
    const organizationId = await requireSetupOrganizationId();
    const body = await req.json();
    const validated = validateSlug(body.slug ?? "");
    if (!validated.ok) {
      return Response.json({ error: validated.error }, { status: 400 });
    }

    await reserveSlug(organizationId, validated.slug);

    await controlPrisma.organization.update({
      where: { id: organizationId },
      data: { slug: validated.slug, setupStep: SetupStep.REVIEW },
    });

    return Response.json({
      ok: true,
      setupStep: SetupStep.REVIEW,
      slug: validated.slug,
      preview: `${validated.slug}.${getBaseDomain()}`,
    });
  } catch (error) {
    return setupJsonError(error);
  }
}
