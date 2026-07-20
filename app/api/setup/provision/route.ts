import { DEFAULT_APP_SETTINGS } from "@/lib/app-settings";
import { ensureControlPlaneDb, setupJsonError } from "@/lib/installation/setup-api";
import { provisionOrganization } from "@/lib/installation/provisioning-service";
import {
  createSetupLoginToken,
  setupLoginDashboardUrl,
} from "@/lib/installation/setup-login-token";
import { requireSetupOrganizationId, clearSetupSession } from "@/lib/installation/setup-session";
import { controlPrisma } from "@/lib/prisma-control";

function assertProvisioningSecret(req: Request) {
  const secret = process.env.PROVISIONING_SECRET;
  if (!secret) return;
  const header = req.headers.get("x-provisioning-secret");
  if (header !== secret) throw new Error("FORBIDDEN");
}

export async function POST(req: Request) {
  try {
    assertProvisioningSecret(req);
    ensureControlPlaneDb();
    const organizationId = await requireSetupOrganizationId();

    const org = await controlPrisma.organization.findUnique({
      where: { id: organizationId },
      include: { adminDraft: true, branding: true, reservations: true },
    });

    if (!org?.adminDraft) {
      return Response.json({ error: "اطلاعات حساب کاربری ناقص است." }, { status: 400 });
    }

    if (!org.name?.trim()) {
      return Response.json({ error: "نام کسب‌وکار ثبت نشده است." }, { status: 400 });
    }

    const slug = org.reservations[0]?.slug ?? org.slug;
    if (!slug) {
      return Response.json({ error: "زیردامنه انتخاب نشده است." }, { status: 400 });
    }

    const branding = org.branding ?? {
      appName: DEFAULT_APP_SETTINGS.appName,
      appNameShort: DEFAULT_APP_SETTINGS.appNameShort,
      appNameFa: DEFAULT_APP_SETTINGS.appNameFa,
      tagline: DEFAULT_APP_SETTINGS.tagline,
      logoUrl: DEFAULT_APP_SETTINGS.logoUrl,
      iconUrl: DEFAULT_APP_SETTINGS.iconUrl,
      themeColor: DEFAULT_APP_SETTINGS.themeColor,
    };

    const result = await provisionOrganization({
      organizationId,
      organizationSlug: slug,
      admin: {
        username: org.adminDraft.username,
        email: org.adminDraft.email,
        phone: org.adminDraft.phone,
        passwordHash: org.adminDraft.passwordHash,
        fullName: org.adminDraft.fullName,
      },
      branding: {
        appName: branding.appName,
        appNameShort: branding.appNameShort,
        appNameFa: branding.appNameFa,
        tagline: branding.tagline,
        logoUrl: branding.logoUrl,
        iconUrl: branding.iconUrl,
        themeColor: branding.themeColor,
      },
    });

    const setupToken = await createSetupLoginToken(result.tenantUserId, organizationId);
    const dashboardUrl = setupLoginDashboardUrl(result.tenantUrl, setupToken);

    await clearSetupSession();

    return Response.json({
      ok: true,
      tenantUrl: result.tenantUrl,
      dashboardUrl,
      loginUrl: `${result.tenantUrl}/login`,
    });
  } catch (error) {
    return setupJsonError(error);
  }
}
