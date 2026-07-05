import { requireSession, jsonError } from "@/lib/auth-helpers";
import { validateDateAgainstAppSettings } from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";
import { expenseInclude, mapExpense } from "@/lib/expense-mapper";
import { upsertFinancierShares } from "@/lib/expense-financier-shares";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const { id } = await params;

    const expense = await prisma.expense.findFirst({
      where: { id, deletedAt: null },
      include: expenseInclude,
    });

    if (!expense) throw new Error("NOT_FOUND");
    return Response.json(mapExpense(expense));
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.expense.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new Error("NOT_FOUND");

    const isAdmin = session.user.role === "ADMIN";
    if (!isAdmin && existing.addedByUserId !== session.user.id) {
      throw new Error("FORBIDDEN");
    }

    if (body.factorDate) {
      const dateValidation = await validateDateAgainstAppSettings(new Date(body.factorDate));
      if (!dateValidation.ok) {
        return Response.json({ error: dateValidation.message }, { status: 400 });
      }
    }

    const expense = await prisma.$transaction(async (tx) => {
      await tx.expense.update({
        where: { id },
        data: {
          costFactorTypeId: body.costFactorTypeId,
          addedByUserId: isAdmin ? body.addedByUserId : existing.addedByUserId,
          amount: body.amount,
          currency: body.currency,
          description: body.description,
          factorDate: body.factorDate ? new Date(body.factorDate) : undefined,
        },
      });

      if (body.attachmentIds?.length) {
        await tx.expenseAttachment.updateMany({
          where: {
            id: { in: body.attachmentIds },
            uploadedByUserId: session.user.id,
            expenseId: null,
            meetingMinutesId: null,
          },
          data: { expenseId: id },
        });
      }

      if (Array.isArray(body.financierShares)) {
        await upsertFinancierShares(
          tx,
          id,
          existing.addedByUserId,
          body.financierShares.map((share: { userId: string; amount: string }) => ({
            userId: share.userId,
            amount: share.amount,
          })),
        );
      }

      return tx.expense.findUniqueOrThrow({
        where: { id },
        include: expenseInclude,
      });
    });

    return Response.json(mapExpense(expense));
  } catch (error) {
    if (error instanceof Error && error.message) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return jsonError(error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const existing = await prisma.expense.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new Error("NOT_FOUND");

    const isAdmin = session.user.role === "ADMIN";
    if (!isAdmin && existing.addedByUserId !== session.user.id) {
      throw new Error("FORBIDDEN");
    }

    await prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
