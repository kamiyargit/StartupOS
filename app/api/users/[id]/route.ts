import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { requireAdmin, jsonError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { isSuperAdminUser } from "@/lib/roles";

function normalizeSharePercent(value: unknown): number {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) return 0;
  return Math.min(100, Math.max(0, num));
}

async function loadTargetUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, isSuperAdmin: true },
  });
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

    const target = await loadTargetUser(id);
    if (!target) {
      return Response.json({ error: "یافت نشد." }, { status: 404 });
    }

    if (isSuperAdminUser(target)) {
      if (body.role && body.role !== Role.SUPER_ADMIN) {
        return Response.json({ error: "نقش مدیر ارشد قابل تغییر نیست." }, { status: 403 });
      }
      if (body.isActive === false) {
        return Response.json({ error: "مدیر ارشد قابل غیرفعال‌سازی نیست." }, { status: 403 });
      }
    }

    const data: Record<string, unknown> = {
      username: body.username,
      email: body.email,
      fullName: body.fullName,
      phone: body.phone,
      position: body.position,
      avatarUrl: body.avatarUrl,
      role: isSuperAdminUser(target) ? Role.SUPER_ADMIN : body.role,
      isActive: isSuperAdminUser(target) ? true : body.isActive,
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
      isSuperAdmin: user.isSuperAdmin,
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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const target = await loadTargetUser(id);
    if (!target) {
      return Response.json({ error: "یافت نشد." }, { status: 404 });
    }

    if (isSuperAdminUser(target)) {
      return Response.json({ error: "حذف مدیر ارشد مجاز نیست." }, { status: 403 });
    }

    await prisma.user.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
