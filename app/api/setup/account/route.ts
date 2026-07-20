import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { SetupStep } from "@/generated/control-client";
import { ensureControlPlaneDb, setupJsonError } from "@/lib/installation/setup-api";
import { requireSetupOrganizationId } from "@/lib/installation/setup-session";
import { controlPrisma } from "@/lib/prisma-control";

function usernameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "admin";
  const cleaned = local.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 32);
  return cleaned.length >= 3 ? cleaned : `user-${Date.now().toString(36)}`;
}

export async function PATCH(req: Request) {
  try {
    ensureControlPlaneDb();
    const organizationId = await requireSetupOrganizationId();
    const body = await req.json();

    const email = body.email?.trim();
    const password = body.password;
    const fullName = body.fullName?.trim() || "مدیر ارشد";

    if (!email || !password || password.length < 8) {
      return Response.json(
        { error: "ایمیل و رمز عبور (حداقل ۸ کاراکتر) الزامی است." },
        { status: 400 },
      );
    }

    const username = usernameFromEmail(email);
    const passwordHash = await bcrypt.hash(password, 12);
    const emailVerifyToken = randomBytes(24).toString("hex");

    await controlPrisma.superAdminDraft.upsert({
      where: { organizationId },
      update: {
        username,
        email,
        phone: "",
        passwordHash,
        fullName,
        emailVerified: false,
        emailVerifyToken,
      },
      create: {
        organizationId,
        username,
        email,
        phone: "",
        passwordHash,
        fullName,
        emailVerified: false,
        emailVerifyToken,
      },
    });

    await controlPrisma.organization.update({
      where: { id: organizationId },
      data: { setupStep: SetupStep.BUSINESS },
    });

    await controlPrisma.provisioningJob.updateMany({
      where: { organizationId },
      data: { currentStep: SetupStep.BUSINESS },
    });

    return Response.json({ ok: true, setupStep: "BUSINESS" });
  } catch (error) {
    return setupJsonError(error);
  }
}
