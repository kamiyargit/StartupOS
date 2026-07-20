import bcrypt from "bcryptjs";
import { requireSuperAdmin, jsonError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { sendOtp, verifyOtp } from "@/lib/sms/otp-service";

export async function POST(req: Request) {
  try {
    const session = await requireSuperAdmin();
    const body = await req.json();
    const action = body.action as string;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, phone: true, isSuperAdmin: true, role: true },
    });
    if (!user?.phone) {
      return Response.json({ error: "شماره تلفن مدیر ارشد ثبت نشده است." }, { status: 400 });
    }

    if (action === "send_otp") {
      await sendOtp(user.phone, "SUPER_ADMIN_PASSWORD_CHANGE");
      return Response.json({ ok: true });
    }

    if (action === "change_password") {
      const otp = typeof body.otp === "string" ? body.otp : "";
      const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
      if (!otp || newPassword.length < 8) {
        return Response.json({ error: "کد OTP و رمز عبور جدید (حداقل ۸ کاراکتر) الزامی است." }, { status: 400 });
      }

      const valid = await verifyOtp(user.phone, "SUPER_ADMIN_PASSWORD_CHANGE", otp);
      if (!valid) {
        return Response.json({ error: "کد OTP نامعتبر یا منقضی شده است." }, { status: 401 });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await bcrypt.hash(newPassword, 12) },
      });

      return Response.json({ ok: true });
    }

    return Response.json({ error: "عملیات نامعتبر" }, { status: 400 });
  } catch (error) {
    return jsonError(error);
  }
}
