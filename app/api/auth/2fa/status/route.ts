import { requireSession, jsonError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireSession();
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { twoFactorEnabled: true },
    });

    return Response.json({
      enabled: user?.twoFactorEnabled ?? false,
    });
  } catch (error) {
    return jsonError(error);
  }
}
