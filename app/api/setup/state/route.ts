import { ensureControlPlaneDb, setupJsonError } from "@/lib/installation/setup-api";
import { getSetupOrganizationId } from "@/lib/installation/setup-session";
import { controlPrisma } from "@/lib/prisma-control";

export async function GET() {
  try {
    ensureControlPlaneDb();
    const organizationId = await getSetupOrganizationId();
    if (!organizationId) {
      return Response.json({ session: null });
    }

    const org = await controlPrisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        members: true,
        adminDraft: { select: { username: true, email: true, phone: true, fullName: true } },
        branding: true,
        reservations: { where: { status: { in: ["RESERVED", "ACTIVE"] } } },
        jobs: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!org) return Response.json({ session: null });

    return Response.json({
      session: {
        organizationId: org.id,
        setupStep: org.setupStep,
        status: org.status,
        organization: {
          name: org.name,
          description: org.description,
          businessType: org.businessType,
          companyInfo: org.companyInfo,
          slug: org.slug,
          tenantUrl: org.tenantUrl,
        },
        members: org.members,
        adminDraft: org.adminDraft,
        branding: org.branding,
        slug: org.reservations[0]?.slug ?? org.slug,
        job: org.jobs[0] ?? null,
      },
    });
  } catch (error) {
    return setupJsonError(error);
  }
}
