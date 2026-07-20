import bcrypt from "bcryptjs";
import { SetupStep } from "@/generated/control-client";
import { ensureControlPlaneDb, setupJsonError } from "@/lib/installation/setup-api";
import { requireSetupOrganizationId } from "@/lib/installation/setup-session";
import { controlPrisma } from "@/lib/prisma-control";

export async function PATCH(req: Request) {
  try {
    ensureControlPlaneDb();
    const organizationId = await requireSetupOrganizationId();
    const body = await req.json();

    const username = body.username?.trim();
    const email = body.email?.trim();
    const phone = body.phone?.trim();
    const password = body.password;
    const fullName = body.fullName?.trim() || "مدیر ارشد";

    if (!username || !email || !phone || !password || password.length < 8) {
      return Response.json(
        { error: "نام کاربری، ایمیل، تلفن و رمز عبور (حداقل ۸ کاراکتر) الزامی است." },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await controlPrisma.superAdminDraft.upsert({
      where: { organizationId },
      update: { username, email, phone, passwordHash, fullName },
      create: { organizationId, username, email, phone, passwordHash, fullName },
    });

    await controlPrisma.organization.update({
      where: { id: organizationId },
      data: { setupStep: SetupStep.TEAM },
    });

    return Response.json({ ok: true, setupStep: SetupStep.TEAM });
  } catch (error) {
    return setupJsonError(error);
  }
}
