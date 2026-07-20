import { Prisma } from "@prisma/client";
import { requireSession, jsonError } from "@/lib/auth-helpers";
import { validateDateAgainstAppSettings } from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";
import { expenseInclude, mapExpense } from "@/lib/expense-mapper";
import { jalaliMonthRange } from "@/lib/dates";
import { createFinancierSharePayments } from "@/lib/expense-financier-shares";
import { buildPaginatedResult, parsePaginationParams } from "@/lib/pagination";

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";
    const typeId = searchParams.get("typeId");
    const userId = searchParams.get("userId");
    const jy = searchParams.get("jy");
    const jm = searchParams.get("jm");
    const { page, pageSize, skip, take } = parsePaginationParams(searchParams);

    const where: Prisma.ExpenseWhereInput = { deletedAt: null };

    if (q) {
      where.OR = [
        { description: { contains: q, mode: "insensitive" } },
        { addedBy: { fullName: { contains: q, mode: "insensitive" } } },
        { costFactorType: { name: { contains: q, mode: "insensitive" } } },
      ];
    }
    if (typeId) where.costFactorTypeId = typeId;
    if (userId) where.addedByUserId = userId;
    if (jy && jm) {
      const { start, end } = jalaliMonthRange(Number(jy), Number(jm));
      where.factorDate = { gte: start, lte: end };
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: expenseInclude,
        orderBy: { factorDate: "desc" },
        skip,
        take,
      }),
      prisma.expense.count({ where }),
    ]);

    return Response.json(buildPaginatedResult(expenses.map(mapExpense), total, page, pageSize));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();

    if (!body.attachmentIds?.length) {
      return Response.json({ error: "حداقل یک فاکتور الزامی است." }, { status: 400 });
    }

    const factorDate = new Date(body.factorDate);
    const dateValidation = await validateDateAgainstAppSettings(factorDate);
    if (!dateValidation.ok) {
      return Response.json({ error: dateValidation.message }, { status: 400 });
    }

    const expense = await prisma.$transaction(async (tx) => {
      const addedByUserId = body.addedByUserId ?? session.user.id;
      const created = await tx.expense.create({
        data: {
          costFactorTypeId: body.costFactorTypeId,
          addedByUserId,
          amount: body.amount,
          currency: body.currency ?? "TOMAN",
          description: body.description ?? null,
          factorDate,
        },
      });

      if (Array.isArray(body.financierShares) && body.financierShares.length > 0) {
        for (const share of body.financierShares) {
          const createdShare = await tx.expenseFinancierShare.create({
            data: {
              expenseId: created.id,
              userId: share.userId,
              amount: share.amount,
            },
          });

          if (Array.isArray(share.payments) && share.payments.length > 0) {
            await createFinancierSharePayments(
              tx,
              created.id,
              createdShare.id,
              addedByUserId,
              share.payments,
            );
          }
        }
      }

      await tx.expenseAttachment.updateMany({
        where: {
          id: { in: body.attachmentIds },
          uploadedByUserId: session.user.id,
          expenseId: null,
          meetingMinutesId: null,
        },
        data: { expenseId: created.id },
      });

      return tx.expense.findUniqueOrThrow({
        where: { id: created.id },
        include: expenseInclude,
      });
    });

    return Response.json(mapExpense(expense), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return jsonError(error);
  }
}
