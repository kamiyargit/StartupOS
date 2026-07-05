import { requireSession, requireAdmin, jsonError } from "@/lib/auth-helpers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { UserDTO } from "@/lib/dto";

function normalizeSharePercent(value: unknown): number {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) return 0;
  return Math.min(100, Math.max(0, num));
}

function mapUser(u: {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone: string | null;
  position: string | null;
  avatarUrl: string | null;
  role: "ADMIN" | "USER";
  isActive: boolean;
  isFinancier: boolean;
  sharePercent: Prisma.Decimal;
  twoFactorEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}): UserDTO {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone,
    position: u.position,
    avatarUrl: u.avatarUrl,
    role: u.role,
    isActive: u.isActive,
    isFinancier: u.isFinancier,
    sharePercent: u.sharePercent.toString(),
    twoFactorEnabled: u.twoFactorEnabled,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

export async function GET() {
  try {
    await requireSession();
    const users = await prisma.user.findMany({ orderBy: { fullName: "asc" } });
    return Response.json(users.map(mapUser));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const bcrypt = await import("bcryptjs");

    const passwordHash = await bcrypt.hash(body.password, 12);
    const sharePercent = normalizeSharePercent(body.sharePercent);
    const user = await prisma.user.create({
      data: {
        username: body.username,
        email: body.email,
        passwordHash,
        fullName: body.fullName,
        phone: body.phone ?? null,
        position: body.position ?? null,
        avatarUrl: body.avatarUrl ?? null,
        role: body.role ?? "USER",
        isActive: body.isActive ?? true,
        isFinancier: body.isFinancier ?? false,
        sharePercent: body.isFinancier ? sharePercent : 0,
      },
    });

    return Response.json(mapUser(user), { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
