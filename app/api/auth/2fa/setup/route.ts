import { requireSession, jsonError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  buildOtpAuthUri,
  createQrDataUrl,
  createSetupToken,
  createTotpSecret,
} from "@/lib/two-factor";

export async function POST() {
  try {
    const session = await requireSession();
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      return Response.json({ error: "کاربر یافت نشد." }, { status: 404 });
    }

    if (user.twoFactorEnabled) {
      return Response.json({ error: "احراز هویت دو مرحله‌ای قبلاً فعال شده است." }, { status: 400 });
    }

    const secret = createTotpSecret();
    const label = user.email || user.username;
    const uri = buildOtpAuthUri(label, secret);
    const qrDataUrl = await createQrDataUrl(uri);

    return Response.json({
      qrDataUrl,
      manualKey: secret,
      setupToken: createSetupToken(user.id, secret),
    });
  } catch (error) {
    return jsonError(error);
  }
}
