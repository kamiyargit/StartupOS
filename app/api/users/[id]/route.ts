import bcrypt from "bcryptjs";
import { requireAdmin, jsonError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

function normalizeSharePercent(value: unknown): number {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) return 0;
  return Math.min(100, Math.max(0, num));
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const sharePercent = normalizeSharePercent(body.sharePercent);

    const data: Record<string, unknown> = {
      username: body.username,
      email: body.email,
      fullName: body.fullName,
      phone: body.phone,
      position: body.position,
      avatarUrl: body.avatarUrl,
      role: body.role,
      isActive: body.isActive,
      isFinancier: body.isFinancier ?? false,
      sharePercent: body.isFinancier ? sharePercent : 0,
    };

    if (body.password) {
      data.passwordHash = await bcrypt.hash(body.password, 12);
    }

    const user = await prisma.user.update({ where: { id }, data });
    return Response.json({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      position: user.position,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isActive: user.isActive,
      isFinancier: user.isFinancier,
      sharePercent: user.sharePercent.toString(),
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    });
  } catch (error) {
    return jsonError(error);
  }
}
