import { verifyUserCredentials } from "@/lib/credentials-auth";
import {
  createTwoFactorTicket,
  decryptSecret,
  verifyPendingToken,
  verifyTotpCode,
} from "@/lib/two-factor";

export async function POST(req: Request) {
  const body = await req.json();
  const login = typeof body.login === "string" ? body.login.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const pendingToken = typeof body.pendingToken === "string" ? body.pendingToken : "";
  const otp = typeof body.otp === "string" ? body.otp : "";

  if (!login || !password || !pendingToken || !otp) {
    return Response.json({ error: "اطلاعات ورود ناقص است." }, { status: 400 });
  }

  const pending = verifyPendingToken(pendingToken);
  if (!pending) {
    return Response.json({ error: "نشست تأیید منقضی شده است. دوباره وارد شوید." }, { status: 401 });
  }

  const user = await verifyUserCredentials(login, password);
  if (!user || user.id !== pending.sub) {
    return Response.json({ error: "نام کاربری یا رمز عبور اشتباه است." }, { status: 401 });
  }

  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    return Response.json({ error: "احراز هویت دو مرحله‌ای برای این حساب فعال نیست." }, { status: 400 });
  }

  const secret = decryptSecret(user.twoFactorSecret);
  const validOtp = await verifyTotpCode(secret, otp);
  if (!validOtp) {
    return Response.json({ error: "کد احراز هویت نامعتبر است." }, { status: 401 });
  }

  return Response.json({
    twoFactorTicket: createTwoFactorTicket(user.id),
  });
}
