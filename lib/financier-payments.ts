import { FinancierPaymentKind } from "@prisma/client";
import { Role } from "@prisma/client";
import { isDateBeforeMinJalaliYear, minJalaliYearErrorMessage } from "@/lib/dates";

export type { FinancierPaymentKind };

export type FinancierSharePaymentStatus = "unpaid" | "partial" | "paid";
export type ExpenseFundingStatus = "unfunded" | "partial" | "funded";

export type SessionUser = {
  id: string;
  role: Role | string;
};

export type ExpenseForPermission = {
  addedByUserId: string;
};

export type ShareForPermission = {
  userId: string;
};

export type PaymentLike = {
  amount: string | bigint | { toString(): string };
  kind: FinancierPaymentKind;
};

export const FINANCIER_PAYMENT_KIND_LABELS: Record<FinancierPaymentKind, string> = {
  OWN_SHARE: "پرداخت سهم شخصی",
  ADVANCE: "پیش‌پرداخت (تامین هزینه)",
  REIMBURSEMENT: "بازپرداخت به تامین‌کننده",
};

export const FINANCIER_PAYMENT_KIND_HINTS: Record<FinancierPaymentKind, string> = {
  OWN_SHARE: "فقط سهم خودتان را می‌پردازید؛ مثل پرداخت مستقیم به فروشنده یا صندوق مشترک.",
  ADVANCE:
    "بیش از سهم خودتان (یا کل مبلغ هزینه) را می‌پردازید تا فاکتور تامین شود؛ سهم بقیه به شما بدهکار می‌شود.",
  REIMBURSEMENT:
    "سهم خودتان را به تامین‌کننده‌ای که قبلاً پیش‌پرداخت کرده بازمی‌گردانید؛ دریافت‌کننده را انتخاب کنید.",
};

export function canManageFinancierSharePayment(
  session: SessionUser,
  expense: ExpenseForPermission,
  share: ShareForPermission,
): boolean {
  if (session.role === "ADMIN") return true;
  if (expense.addedByUserId === session.id) return true;
  if (share.userId === session.id) return true;
  return false;
}

export function parsePaymentKind(value: unknown): FinancierPaymentKind {
  const kind = String(value ?? "OWN_SHARE").toUpperCase();
  if (kind === "ADVANCE" || kind === "REIMBURSEMENT" || kind === "OWN_SHARE") {
    return kind;
  }
  return "OWN_SHARE";
}

export function sumPaymentAmounts(payments: { amount: PaymentLike["amount"] }[]): bigint {
  return payments.reduce((sum, payment) => sum + BigInt(payment.amount.toString()), BigInt(0));
}

export function sumSettledOnShare(payments: PaymentLike[]): bigint {
  return payments
    .filter(
      (payment) =>
        payment.kind === "OWN_SHARE" ||
        payment.kind === "REIMBURSEMENT" ||
        payment.kind === "ADVANCE",
    )
    .reduce((sum, payment) => sum + BigInt(payment.amount.toString()), BigInt(0));
}

export function sumExpenseFunding(payments: PaymentLike[]): bigint {
  return sumPaymentAmounts(payments);
}

export function deriveSharePaymentStatus(
  shareAmount: bigint,
  settledAmount: bigint,
): FinancierSharePaymentStatus {
  if (settledAmount <= BigInt(0)) return "unpaid";
  if (settledAmount >= shareAmount) return "paid";
  return "partial";
}

export function deriveExpenseFundingStatus(
  expenseAmount: bigint,
  fundedAmount: bigint,
): ExpenseFundingStatus {
  if (fundedAmount <= BigInt(0)) return "unfunded";
  if (fundedAmount >= expenseAmount) return "funded";
  return "partial";
}

export function validatePaymentAmount(amount: unknown): bigint | null {
  const normalized = String(amount ?? "").replace(/\D/g, "");
  if (!normalized) return null;
  const value = BigInt(normalized);
  if (value <= BigInt(0)) return null;
  return value;
}

export function validateNewPaymentInput(input: {
  amount: unknown;
  paymentDate: unknown;
  attachmentId: unknown;
  kind?: unknown;
  payeeUserId?: unknown;
  requireAttachment?: boolean;
  creditorUserId?: string | null;
  financierUserIds?: string[];
  minJalaliYear?: number;
}):
  | {
      ok: true;
      amount: bigint;
      paymentDate: Date;
      attachmentId: string;
      kind: FinancierPaymentKind;
      payeeUserId: string | null;
    }
  | { ok: false; message: string } {
  const amount = validatePaymentAmount(input.amount);
  if (!amount) {
    return { ok: false, message: "مبلغ پرداخت باید بیشتر از صفر باشد." };
  }

  if (!input.paymentDate) {
    return { ok: false, message: "تاریخ پرداخت الزامی است." };
  }

  const paymentDate = new Date(String(input.paymentDate));
  if (Number.isNaN(paymentDate.getTime())) {
    return { ok: false, message: "تاریخ پرداخت نامعتبر است." };
  }

  if (
    input.minJalaliYear !== undefined &&
    isDateBeforeMinJalaliYear(paymentDate, input.minJalaliYear)
  ) {
    return { ok: false, message: minJalaliYearErrorMessage(input.minJalaliYear) };
  }

  const attachmentId = String(input.attachmentId ?? "").trim();
  if (input.requireAttachment !== false && !attachmentId) {
    return { ok: false, message: "سند پرداخت الزامی است." };
  }

  const kind = parsePaymentKind(input.kind);
  let payeeUserId = String(input.payeeUserId ?? "").trim() || null;

  if (kind === "REIMBURSEMENT") {
    if (!payeeUserId) {
      return { ok: false, message: "دریافت‌کننده بازپرداخت الزامی است." };
    }
    if (input.financierUserIds && !input.financierUserIds.includes(payeeUserId)) {
      return { ok: false, message: "دریافت‌کننده باید یکی از تامین‌کنندگان این هزینه باشد." };
    }
    if (input.creditorUserId && payeeUserId !== input.creditorUserId) {
      return { ok: false, message: "بازپرداخت باید به تامین‌کننده‌ای که پیش‌پرداخت کرده انجام شود." };
    }
  } else {
    payeeUserId = null;
  }

  return { ok: true, amount, paymentDate, attachmentId, kind, payeeUserId };
}

export function validatePaymentLimits(input: {
  kind: FinancierPaymentKind;
  amount: bigint;
  shareAmount: bigint;
  expenseAmount: bigint;
  settledOnShare: bigint;
  totalFunded: bigint;
  excludeAmount?: bigint;
}): { ok: true } | { ok: false; message: string } {
  const settled = input.settledOnShare - (input.excludeAmount ?? BigInt(0));
  const funded = input.totalFunded - (input.excludeAmount ?? BigInt(0));

  if (input.kind === "ADVANCE") {
    const remainingFunding = input.expenseAmount - funded;
    if (input.amount > remainingFunding) {
      return { ok: false, message: "مبلغ پیش‌پرداخت از باقیمانده تامین هزینه بیشتر است." };
    }
    return { ok: true };
  }

  const remainingShare = input.shareAmount - settled;
  if (input.amount > remainingShare) {
    return { ok: false, message: "مبلغ پرداخت از باقیمانده سهم تامین‌کننده بیشتر است." };
  }

  return { ok: true };
}

/** @deprecated use validatePaymentLimits */
export function validateSharePaymentsTotal(
  shareAmount: bigint,
  paidAmount: bigint,
  additionalAmount: bigint = BigInt(0),
): { ok: true } | { ok: false; message: string } {
  const nextTotal = paidAmount + additionalAmount;
  if (nextTotal > shareAmount) {
    return { ok: false, message: "مجموع پرداخت‌ها از سهم تامین‌کننده بیشتر است." };
  }
  return { ok: true };
}
