import { requireSession, jsonError } from "@/lib/auth-helpers";
import { verifyUserCredentials } from "@/lib/credentials-auth";
import { prisma } from "@/lib/prisma";
import { decryptSecret, verifyTotpCode } from "@/lib/two-factor";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const password = typeof body.password === "string" ? body.password : "";
    const code = typeof body.code === "string" ? body.code : "";

    if (!password || !code) {
      return Response.json({ error: "رمز عبور و کد احراز هویت الزامی است." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      return Response.json({ error: "احراز هویت دو مرحله‌ای فعال نیست." }, { status: 400 });
    }

    const login = user.email || user.username;
    const verified = await verifyUserCredentials(login, password);
    if (!verified || verified.id !== user.id) {
      return Response.json({ error: "رمز عبور اشتباه است." }, { status: 401 });
    }

    const secret = decryptSecret(user.twoFactorSecret);
    const validOtp = await verifyTotpCode(secret, code);
    if (!validOtp) {
      return Response.json({ error: "کد احراز هویت نامعتبر است." }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    return Response.json({ enabled: false });
  } catch (error) {
    return jsonError(error);
  }
}
