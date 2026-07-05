import { FinancierPaymentKind, Prisma } from "@prisma/client";
import { getAppSettings } from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";
import {
  sumSettledOnShare,
  validateNewPaymentInput,
  validatePaymentLimits,
  sumExpenseFunding,
} from "@/lib/financier-payments";

export type DraftFinancierPaymentInput = {
  amount: string;
  paymentDate: string;
  attachmentId: string;
  kind?: FinancierPaymentKind;
  payeeUserId?: string | null;
};

export type DraftFinancierShareInput = {
  userId: string;
  amount: string;
  payments?: DraftFinancierPaymentInput[];
};

type ShareWithPayments = {
  id: string;
  userId: string;
  expenseId: string;
  amount: { toString(): string };
  creditorUserId: string | null;
  payments: {
    id?: string;
    amount: { toString(): string };
    kind: FinancierPaymentKind;
  }[];
};

export async function syncCreditorsForExpense(
  tx: Prisma.TransactionClient,
  expenseId: string,
) {
  const shares = await tx.expenseFinancierShare.findMany({
    where: { expenseId },
    include: { payments: true },
  });

  let creditorUserId: string | null = null;
  let maxAdvance = BigInt(0);

  for (const share of shares) {
    const advanceTotal = share.payments
      .filter((payment) => payment.kind === "ADVANCE")
      .reduce((sum, payment) => sum + BigInt(payment.amount.toString()), BigInt(0));
    if (advanceTotal > maxAdvance) {
      maxAdvance = advanceTotal;
      creditorUserId = share.userId;
    }
  }

  if (maxAdvance <= BigInt(0)) {
    creditorUserId = null;
  }

  for (const share of shares) {
    const shareAmount = BigInt(share.amount.toString());
    const settled = sumSettledOnShare(
      share.payments.map((payment) => ({
        amount: payment.amount.toString(),
        kind: payment.kind,
      })),
    );
    const isSettled = settled >= shareAmount;

    let nextCreditor: string | null = null;
    if (!isSettled && creditorUserId && share.userId !== creditorUserId) {
      nextCreditor = creditorUserId;
    }

    if (share.creditorUserId !== nextCreditor) {
      await tx.expenseFinancierShare.update({
        where: { id: share.id },
        data: { creditorUserId: nextCreditor },
      });
    }
  }
}

async function validateAndCreatePayment(
  tx: Prisma.TransactionClient,
  input: {
    share: ShareWithPayments & { expenseId: string };
    expenseAmount: bigint;
    allShares: ShareWithPayments[];
    createdByUserId: string;
    payment: DraftFinancierPaymentInput;
    excludePaymentId?: string;
  },
) {
  const financierUserIds = input.allShares.map((share) => share.userId);
  const shareAmount = BigInt(input.share.amount.toString());

  const otherPayments = input.share.payments.filter(
    (payment) => !input.excludePaymentId || payment.id !== input.excludePaymentId,
  );

  const { minJalaliYear } = await getAppSettings();

  const validated = validateNewPaymentInput({
    amount: input.payment.amount,
    paymentDate: input.payment.paymentDate,
    attachmentId: input.payment.attachmentId,
    kind: input.payment.kind,
    payeeUserId: input.payment.payeeUserId,
    requireAttachment: true,
    creditorUserId: input.share.creditorUserId,
    financierUserIds,
    minJalaliYear,
  });
  if (!validated.ok) {
    throw new Error(validated.message);
  }

  const allPayments = input.allShares.flatMap((share) =>
    share.payments
      .filter((payment) => !input.excludePaymentId || payment.id !== input.excludePaymentId)
      .map((payment) => ({
        amount: payment.amount.toString(),
        kind: payment.kind,
      })),
  );

  const settledOnShare = sumSettledOnShare(
    otherPayments.map((payment) => ({
      amount: payment.amount.toString(),
      kind: payment.kind,
    })),
  );
  const totalFunded = sumExpenseFunding(allPayments);

  const limits = validatePaymentLimits({
    kind: validated.kind,
    amount: validated.amount,
    shareAmount,
    expenseAmount: input.expenseAmount,
    settledOnShare,
    totalFunded,
  });
  if (!limits.ok) {
    throw new Error(limits.message);
  }

  const attachment = await tx.expenseAttachment.findFirst({
    where: {
      id: validated.attachmentId,
      uploadedByUserId: input.createdByUserId,
      expenseId: null,
      meetingMinutesId: null,
      OR: input.excludePaymentId
        ? [
            { financierSharePayment: null },
            { financierSharePayment: { id: input.excludePaymentId } },
          ]
        : [{ financierSharePayment: null }],
    },
  });
  if (!attachment) {
    throw new Error("سند پرداخت نامعتبر است.");
  }

  return validated;
}

export async function createFinancierSharePayments(
  tx: Prisma.TransactionClient,
  expenseId: string,
  shareId: string,
  createdByUserId: string,
  payments: DraftFinancierPaymentInput[],
) {
  if (!payments.length) return;

  const expenseAmount = BigInt(
    (
      await tx.expense.findUniqueOrThrow({
        where: { id: expenseId },
        select: { amount: true },
      })
    ).amount.toString(),
  );

  for (const payment of payments) {
    const fresh = await tx.expense.findUniqueOrThrow({
      where: { id: expenseId },
      include: { financierShares: { include: { payments: true } } },
    });
    const currentShare = fresh.financierShares.find((item) => item.id === shareId);
    if (!currentShare) throw new Error("NOT_FOUND");

    const validated = await validateAndCreatePayment(tx, {
      share: currentShare,
      expenseAmount,
      allShares: fresh.financierShares,
      createdByUserId,
      payment,
    });

    await tx.expenseFinancierSharePayment.create({
      data: {
        financierShareId: shareId,
        amount: validated.amount.toString(),
        paymentDate: validated.paymentDate,
        kind: validated.kind,
        payeeUserId: validated.payeeUserId,
        attachmentId: validated.attachmentId,
        createdByUserId,
      },
    });
  }

  await syncCreditorsForExpense(tx, expenseId);
}

export async function upsertFinancierShares(
  tx: Prisma.TransactionClient,
  expenseId: string,
  addedByUserId: string,
  shares: DraftFinancierShareInput[],
) {
  const existingShares = await tx.expenseFinancierShare.findMany({
    where: { expenseId },
    include: { payments: true },
  });
  const existingByUserId = new Map(existingShares.map((share) => [share.userId, share]));
  const incomingUserIds = new Set(shares.map((share) => share.userId));

  for (const share of shares) {
    const existing = existingByUserId.get(share.userId);
    const shareAmount = BigInt(String(share.amount).replace(/\D/g, "") || "0");

    if (existing) {
      const existingAmount = BigInt(String(existing.amount).replace(/\D/g, "") || "0");
      if (shareAmount === existingAmount) {
        continue;
      }

      const settled = sumSettledOnShare(
        existing.payments.map((payment) => ({
          amount: payment.amount.toString(),
          kind: payment.kind,
        })),
      );
      if (shareAmount < settled) {
        throw new Error("مبلغ سهم نمی‌تواند کمتر از مجموع پرداخت‌های ثبت‌شده باشد.");
      }

      await tx.expenseFinancierShare.update({
        where: { id: existing.id },
        data: { amount: share.amount },
      });
      continue;
    }

    const created = await tx.expenseFinancierShare.create({
      data: {
        expenseId,
        userId: share.userId,
        amount: share.amount,
      },
    });

    if (share.payments?.length) {
      await createFinancierSharePayments(
        tx,
        expenseId,
        created.id,
        addedByUserId,
        share.payments,
      );
    }
  }

  for (const existing of existingShares) {
    if (!incomingUserIds.has(existing.userId)) {
      if (existing.payments.length > 0) {
        throw new Error("حذف تامین‌کننده‌ای که پرداخت ثبت شده دارد مجاز نیست.");
      }
      await tx.expenseFinancierShare.delete({ where: { id: existing.id } });
    }
  }
}

export async function loadExpenseShareContext(expenseId: string, shareId: string) {
  return prisma.expenseFinancierShare.findFirst({
    where: {
      id: shareId,
      expenseId,
      expense: { deletedAt: null },
    },
    include: {
      expense: {
        include: {
          financierShares: { include: { payments: true } },
        },
      },
      payments: { include: { attachment: true, payee: true }, orderBy: { paymentDate: "asc" } },
      user: true,
      creditor: true,
    },
  });
}

export async function addSharePayment(
  expenseId: string,
  shareId: string,
  createdByUserId: string,
  payment: DraftFinancierPaymentInput,
) {
  await prisma.$transaction(async (tx) => {
    await createFinancierSharePayments(tx, expenseId, shareId, createdByUserId, [payment]);
  });
}

export async function updateSharePayment(
  expenseId: string,
  shareId: string,
  paymentId: string,
  createdByUserId: string,
  payment: DraftFinancierPaymentInput,
) {
  const share = await loadExpenseShareContext(expenseId, shareId);
  if (!share) throw new Error("NOT_FOUND");

  const expenseAmount = BigInt(share.expense.amount.toString());

  await prisma.$transaction(async (tx) => {
    const validated = await validateAndCreatePayment(tx, {
      share,
      expenseAmount,
      allShares: share.expense.financierShares,
      createdByUserId,
      payment,
      excludePaymentId: paymentId,
    });

    await tx.expenseFinancierSharePayment.update({
      where: { id: paymentId },
      data: {
        amount: validated.amount.toString(),
        paymentDate: validated.paymentDate,
        kind: validated.kind,
        payeeUserId: validated.payeeUserId,
        attachmentId: validated.attachmentId,
      },
    });

    await syncCreditorsForExpense(tx, expenseId);
  });
}

export async function deleteSharePayment(expenseId: string, paymentId: string, attachmentId: string | null) {
  await prisma.$transaction(async (tx) => {
    await tx.expenseFinancierSharePayment.delete({ where: { id: paymentId } });
    if (attachmentId) {
      await tx.expenseAttachment.delete({ where: { id: attachmentId } });
    }
    await syncCreditorsForExpense(tx, expenseId);
  });
}
