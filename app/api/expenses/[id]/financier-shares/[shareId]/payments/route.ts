import { requireSession, jsonError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { expenseInclude, mapExpense } from "@/lib/expense-mapper";
import { addSharePayment, loadExpenseShareContext } from "@/lib/expense-financier-shares";
import { canManageFinancierSharePayment } from "@/lib/financier-payments";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; shareId: string }> },
) {
  try {
    const session = await requireSession();
    const { id, shareId } = await params;
    const body = await req.json();

    const share = await loadExpenseShareContext(id, shareId);
    if (!share) throw new Error("NOT_FOUND");

    if (
      !canManageFinancierSharePayment(session.user, share.expense, { userId: share.userId })
    ) {
      throw new Error("FORBIDDEN");
    }

    await addSharePayment(id, shareId, session.user.id, {
      amount: body.amount,
      paymentDate: body.paymentDate,
      attachmentId: body.attachmentId,
      kind: body.kind,
      payeeUserId: body.payeeUserId,
    });

    const expense = await prisma.expense.findUniqueOrThrow({
      where: { id },
      include: expenseInclude,
    });

    return Response.json(mapExpense(expense), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message && error.message !== "NOT_FOUND" && error.message !== "FORBIDDEN") {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return jsonError(error);
  }
}
