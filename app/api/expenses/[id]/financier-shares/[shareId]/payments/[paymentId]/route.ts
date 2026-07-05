import { requireSession, jsonError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { expenseInclude, mapExpense } from "@/lib/expense-mapper";
import {
  deleteSharePayment,
  loadExpenseShareContext,
  updateSharePayment,
} from "@/lib/expense-financier-shares";
import { canManageFinancierSharePayment } from "@/lib/financier-payments";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; shareId: string; paymentId: string }> },
) {
  try {
    const session = await requireSession();
    const { id, shareId, paymentId } = await params;
    const body = await req.json();

    const share = await loadExpenseShareContext(id, shareId);
    if (!share) throw new Error("NOT_FOUND");

    if (
      !canManageFinancierSharePayment(session.user, share.expense, { userId: share.userId })
    ) {
      throw new Error("FORBIDDEN");
    }

    const payment = share.payments.find((item) => item.id === paymentId);
    if (!payment) throw new Error("NOT_FOUND");

    await updateSharePayment(id, shareId, paymentId, session.user.id, {
      amount: body.amount ?? payment.amount.toString(),
      paymentDate: body.paymentDate ?? payment.paymentDate.toISOString(),
      attachmentId: body.attachmentId ?? payment.attachmentId ?? "",
      kind: body.kind ?? payment.kind,
      payeeUserId: body.payeeUserId ?? payment.payeeUserId,
    });

    const expense = await prisma.expense.findUniqueOrThrow({
      where: { id },
      include: expenseInclude,
    });

    return Response.json(mapExpense(expense));
  } catch (error) {
    if (error instanceof Error && error.message && error.message !== "NOT_FOUND" && error.message !== "FORBIDDEN") {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return jsonError(error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; shareId: string; paymentId: string }> },
) {
  try {
    const session = await requireSession();
    const { id, shareId, paymentId } = await params;

    const share = await loadExpenseShareContext(id, shareId);
    if (!share) throw new Error("NOT_FOUND");

    if (
      !canManageFinancierSharePayment(session.user, share.expense, { userId: share.userId })
    ) {
      throw new Error("FORBIDDEN");
    }

    const payment = share.payments.find((item) => item.id === paymentId);
    if (!payment) throw new Error("NOT_FOUND");

    await deleteSharePayment(id, paymentId, payment.attachmentId);

    const expense = await prisma.expense.findUniqueOrThrow({
      where: { id },
      include: expenseInclude,
    });

    return Response.json(mapExpense(expense));
  } catch (error) {
    return jsonError(error);
  }
}
