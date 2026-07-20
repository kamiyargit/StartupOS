import { Role } from "@prisma/client";
import { requireSession, requireAdmin, jsonError } from "@/lib/auth-helpers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { UserDTO } from "@/lib/dto";
import { buildPaginatedResult, parsePaginationParams } from "@/lib/pagination";

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
  role: Role;
  isSuperAdmin?: boolean;
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
    isSuperAdmin: u.isSuperAdmin,
    isActive: u.isActive,
    isFinancier: u.isFinancier,
    sharePercent: u.sharePercent.toString(),
    twoFactorEnabled: u.twoFactorEnabled,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);

    if (searchParams.get("all") === "true") {
      const users = await prisma.user.findMany({ orderBy: { fullName: "asc" } });
      return Response.json(users.map(mapUser));
    }

    const q = searchParams.get("q") ?? "";
    const role = searchParams.get("role");
    const isActive = searchParams.get("isActive");
    const isFinancier = searchParams.get("isFinancier");
    const { page, pageSize, skip, take } = parsePaginationParams(searchParams);

    const where: Prisma.UserWhereInput = {};
    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { username: { contains: q, mode: "insensitive" } },
        { position: { contains: q, mode: "insensitive" } },
      ];
    }
    if (role === "ADMIN" || role === "USER" || role === "SUPER_ADMIN") where.role = role;
    if (isActive === "true") where.isActive = true;
    if (isActive === "false") where.isActive = false;
    if (isFinancier === "true") where.isFinancier = true;
    if (isFinancier === "false") where.isFinancier = false;

    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, orderBy: { fullName: "asc" }, skip, take }),
      prisma.user.count({ where }),
    ]);

    return Response.json(buildPaginatedResult(users.map(mapUser), total, page, pageSize));
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
