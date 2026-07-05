import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

async function resolveDbUserId(session: {
  user: { id: string; email?: string | null; username?: string };
}) {
  const user = await prisma.user.findFirst({
    where: {
      isActive: true,
      OR: [
        { id: session.user.id },
        ...(session.user.email ? [{ email: session.user.email }] : []),
        ...(session.user.username ? [{ username: session.user.username }] : []),
      ],
    },
    select: { id: true },
  });
  return user?.id ?? null;
}

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }

  const dbUserId = await resolveDbUserId(session);
  if (!dbUserId) {
    throw new Error("UNAUTHORIZED");
  }

  session.user.id = dbUserId;
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== Role.ADMIN) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export function jsonError(error: unknown, status = 500) {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return Response.json({ error: "لطفاً وارد شوید." }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return Response.json({ error: "دسترسی مجاز نیست." }, { status: 403 });
    }
    if (error.message === "NOT_FOUND") {
      return Response.json({ error: "یافت نشد." }, { status: 404 });
    }
  }
  console.error(error);
  return Response.json({ error: "خطای سرور" }, { status });
}
