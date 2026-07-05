import { requireSession, jsonError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { encryptSecret, verifySetupToken, verifyTotpCode } from "@/lib/two-factor";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const setupToken = typeof body.setupToken === "string" ? body.setupToken : "";
    const code = typeof body.code === "string" ? body.code : "";

    if (!setupToken || !code) {
      return Response.json({ error: "اطلاعات ناقص است." }, { status: 400 });
    }

    const setup = verifySetupToken(setupToken);
    if (!setup || setup.userId !== session.user.id) {
      return Response.json({ error: "نشست راه‌اندازی منقضی شده است." }, { status: 401 });
    }

    const valid = await verifyTotpCode(setup.secret, code);
    if (!valid) {
      return Response.json({ error: "کد احراز هویت نامعتبر است." }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: encryptSecret(setup.secret),
      },
    });

    return Response.json({ enabled: true });
  } catch (error) {
    return jsonError(error);
  }
}
