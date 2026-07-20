import {
  Expense,
  ExpenseAttachment,
  CostFactorType,
  User,
  ExpenseFinancierShare,
  ExpenseFinancierSharePayment,
  FinancierPaymentKind,
} from "@prisma/client";
import { ExpenseDTO, ExpenseAttachmentDTO } from "@/lib/dto";
import { gregorianToJalali, toGregorianString } from "@/lib/dates";
import {
  deriveExpenseFundingStatus,
  deriveSharePaymentStatus,
  sumExpenseFunding,
  sumSettledOnShare,
} from "@/lib/financier-payments";

export const expenseInclude = {
  costFactorType: true,
  addedBy: true,
  attachments: { where: { deletedAt: null } },
  financierShares: {
    include: {
      user: true,
      creditor: true,
      payments: {
        include: { attachment: { where: { deletedAt: null } }, payee: true },
        orderBy: { paymentDate: "asc" as const },
      },
    },
  },
};

type ExpenseWithRelations = Expense & {
  costFactorType: CostFactorType;
  addedBy: User;
  attachments: ExpenseAttachment[];
  financierShares: (ExpenseFinancierShare & {
    user: User;
    creditor: User | null;
    payments: (ExpenseFinancierSharePayment & {
      attachment: ExpenseAttachment | null;
      payee: User | null;
    })[];
  })[];
};

function mapAttachment(a: ExpenseAttachment): ExpenseAttachmentDTO {
  return {
    id: a.id,
    fileName: a.fileName,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    url: `/api/files/${a.id}`,
  };
}

export function mapExpense(e: ExpenseWithRelations): ExpenseDTO {
  const expenseAmount = BigInt(e.amount.toString());
  const allPayments = e.financierShares.flatMap((share) =>
    share.payments.map((payment) => ({
      amount: payment.amount.toString(),
      kind: payment.kind,
    })),
  );
  const fundedAmount = sumExpenseFunding(allPayments);
  const fundingStatus = deriveExpenseFundingStatus(expenseAmount, fundedAmount);

  return {
    id: e.id,
    costFactorTypeId: e.costFactorTypeId,
    costFactorTypeName: e.costFactorType.name,
    costFactorTypeColor: e.costFactorType.color ?? "#534AB7",
    addedByUserId: e.addedByUserId,
    addedByName: e.addedBy.fullName,
    amount: e.amount.toString(),
    currency: e.currency,
    description: e.description,
    factorDate: toGregorianString(e.factorDate),
    factorDateJalali: gregorianToJalali(toGregorianString(e.factorDate)),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    attachments: e.attachments.map(mapAttachment),
    fundedAmount: fundedAmount.toString(),
    fundingStatus,
    financierShares: e.financierShares.map((share) => {
      const shareAmount = BigInt(share.amount.toString());
      const settledAmount = sumSettledOnShare(
        share.payments.map((payment) => ({
          amount: payment.amount.toString(),
          kind: payment.kind,
        })),
      );
      const remainingAmount =
        settledAmount >= shareAmount ? BigInt(0) : shareAmount - settledAmount;

      return {
        id: share.id,
        userId: share.userId,
        userName: share.user.fullName,
        amount: share.amount.toString(),
        paidAmount: settledAmount.toString(),
        remainingAmount: remainingAmount.toString(),
        status: deriveSharePaymentStatus(shareAmount, settledAmount),
        creditorUserId: share.creditorUserId,
        creditorUserName: share.creditor?.fullName ?? null,
        payments: share.payments.map((payment) => ({
          id: payment.id,
          amount: payment.amount.toString(),
          kind: payment.kind as FinancierPaymentKind,
          paymentDate: toGregorianString(payment.paymentDate),
          paymentDateJalali: gregorianToJalali(toGregorianString(payment.paymentDate)),
          payeeUserId: payment.payeeUserId,
          payeeUserName: payment.payee?.fullName ?? null,
          attachment: payment.attachment ? mapAttachment(payment.attachment) : null,
          createdAt: payment.createdAt.toISOString(),
        })),
      };
    }),
  };
}
