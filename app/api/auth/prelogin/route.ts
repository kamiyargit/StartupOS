import { verifyUserCredentials } from "@/lib/credentials-auth";
import { createPendingToken } from "@/lib/two-factor-tokens";

export async function POST(req: Request) {
  const body = await req.json();
  const login = typeof body.login === "string" ? body.login.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!login || !password) {
    return Response.json({ error: "نام کاربری و رمز عبور الزامی است." }, { status: 400 });
  }

  const user = await verifyUserCredentials(login, password);
  if (!user) {
    return Response.json({ error: "نام کاربری یا رمز عبور اشتباه است." }, { status: 401 });
  }

  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    return Response.json({ requires2fa: false });
  }

  return Response.json({
    requires2fa: true,
    pendingToken: createPendingToken(user.id),
  });
}
