import { requireAdmin, jsonError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const type = await prisma.costFactorType.update({
      where: { id },
      data: {
        name: body.name,
        isActive: body.isActive,
        ...(body.color !== undefined ? { color: body.color } : {}),
      },
    });

    return Response.json({
      id: type.id,
      name: type.name,
      color: type.color,
      isActive: type.isActive,
      createdAt: type.createdAt.toISOString(),
      expenseCount: await prisma.expense.count({ where: { costFactorTypeId: id } }),
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

    const existing = await prisma.costFactorType.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("NOT_FOUND");
    }

    const expenseCount = await prisma.expense.count({ where: { costFactorTypeId: id } });
    if (expenseCount > 0) {
      return Response.json(
        {
          error: "این نوع هزینه در فاکتورها استفاده شده و قابل حذف نیست.",
          expenseCount,
        },
        { status: 409 },
      );
    }

    await prisma.costFactorType.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
