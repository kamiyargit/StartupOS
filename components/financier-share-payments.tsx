"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FileText, ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { FinancierPaymentKind } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DualDatePicker } from "@/components/dual-date-picker";
import { FileUpload, UploadedFile } from "@/components/file-upload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ExpenseDTO,
  ExpenseFinancierShareDTO,
  ExpenseFundingStatus,
  FinancierSharePaymentDTO,
  FinancierSharePaymentStatus,
} from "@/lib/dto";
import { ExpenseCurrency, formatCurrencyAmount, formatExpenseMoney, parseCurrencyAmount } from "@/lib/currency";
import { gregorianToJalali, toGregorianString } from "@/lib/dates";
import {
  FINANCIER_PAYMENT_KIND_HINTS,
  FINANCIER_PAYMENT_KIND_LABELS,
  sumExpenseFunding,
  sumSettledOnShare,
} from "@/lib/financier-payments";
import { cn } from "@/lib/utils";

export type DraftFinancierPayment = {
  id: string;
  amount: string;
  paymentDate: Date;
  attachment: UploadedFile;
  kind: FinancierPaymentKind;
  payeeUserId?: string | null;
};

type PaymentFormValues = {
  amount: string;
  paymentDate: Date;
  attachment: UploadedFile;
  kind: FinancierPaymentKind;
  payeeUserId: string | null;
};

type PaymentModalState =
  | { mode: "add"; share: ExpenseFinancierShareDTO }
  | { mode: "edit"; share: ExpenseFinancierShareDTO; payment: FinancierSharePaymentDTO }
  | null;

const paymentDialogClassName =
  "max-sm:fixed max-sm:inset-0 max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:border-0 sm:max-w-lg";

type FinancierSharePaymentsProps = {
  expenseId?: string;
  currency: ExpenseCurrency;
  expenseAmount?: string;
  fundedAmount?: string;
  fundingStatus?: ExpenseFundingStatus;
  shares: ExpenseFinancierShareDTO[];
  mode: "draft" | "live";
  canManageShare: (share: ExpenseFinancierShareDTO) => boolean;
  draftPaymentsByUserId?: Record<string, DraftFinancierPayment[]>;
  onDraftPaymentsChange?: (userId: string, payments: DraftFinancierPayment[]) => void;
  onExpenseUpdated?: (expense: ExpenseDTO) => void;
};

const statusLabels: Record<FinancierSharePaymentStatus, string> = {
  unpaid: "پرداخت نشده",
  partial: "پرداخت جزئی",
  paid: "پرداخت شده",
};

const fundingLabels: Record<ExpenseFundingStatus, string> = {
  unfunded: "تامین نشده",
  partial: "تامین جزئی",
  funded: "تامین شده",
};

const statusClasses: Record<FinancierSharePaymentStatus, string> = {
  unpaid: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  partial: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

const fundingClasses: Record<ExpenseFundingStatus, string> = {
  unfunded: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  partial: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  funded: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

function PaymentDocumentLink({
  attachment,
}: {
  attachment: NonNullable<FinancierSharePaymentDTO["attachment"]>;
}) {
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline dark:text-emerald-400"
    >
      {attachment.mimeType.startsWith("image/") ? (
        <ImageIcon className="h-3.5 w-3.5" />
      ) : (
        <FileText className="h-3.5 w-3.5" />
      )}
      <span className="truncate">{attachment.fileName}</span>
    </a>
  );
}

function SharePaymentForm({
  share,
  shares,
  expenseAmount,
  totalFunded,
  excludePaymentAmount,
  onSave,
  onCancel,
  initial,
  submitLabel,
}: {
  share: ExpenseFinancierShareDTO;
  shares: ExpenseFinancierShareDTO[];
  expenseAmount: bigint;
  totalFunded: bigint;
  excludePaymentAmount?: bigint;
  onSave: (values: PaymentFormValues) => void;
  onCancel?: () => void;
  initial?: Partial<PaymentFormValues> & { attachment?: UploadedFile | null };
  submitLabel: string;
}) {
  const shareAmount = BigInt(share.amount.replace(/\D/g, "") || "0");
  const settledOnShare = sumSettledOnShare(
    share.payments.map((payment) => ({ amount: payment.amount, kind: payment.kind })),
  );
  const settledExcluding = settledOnShare - (excludePaymentAmount ?? BigInt(0));
  const fundedExcluding = totalFunded - (excludePaymentAmount ?? BigInt(0));

  const defaultKind: FinancierPaymentKind =
    share.creditorUserId && settledExcluding < shareAmount
      ? "REIMBURSEMENT"
      : fundedExcluding < expenseAmount
        ? "OWN_SHARE"
        : "OWN_SHARE";

  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [paymentDate, setPaymentDate] = useState<Date | null>(initial?.paymentDate ?? new Date());
  const [kind, setKind] = useState<FinancierPaymentKind>(initial?.kind ?? defaultKind);
  const [payeeUserId, setPayeeUserId] = useState(
    initial?.payeeUserId ?? share.creditorUserId ?? "",
  );
  const [attachment, setAttachment] = useState<UploadedFile[]>(
    initial?.attachment ? [initial.attachment] : [],
  );

  const maxAmount = useMemo(() => {
    if (kind === "ADVANCE") {
      return expenseAmount - fundedExcluding;
    }
    return shareAmount - settledExcluding;
  }, [kind, expenseAmount, fundedExcluding, shareAmount, settledExcluding]);

  const payeeOptions = shares.filter((item) => item.userId !== share.userId);

  const handleSave = () => {
    const normalized = amount.replace(/\D/g, "");
    if (!normalized || normalized === "0") {
      toast.error("مبلغ پرداخت باید بیشتر از صفر باشد.");
      return;
    }
    if (!paymentDate) {
      toast.error("تاریخ پرداخت الزامی است.");
      return;
    }
    if (!attachment[0]) {
      toast.error("سند پرداخت الزامی است.");
      return;
    }
    if (kind === "REIMBURSEMENT" && !payeeUserId) {
      toast.error("دریافت‌کننده بازپرداخت الزامی است.");
      return;
    }
    if (kind === "REIMBURSEMENT" && share.creditorUserId && payeeUserId !== share.creditorUserId) {
      toast.error("بازپرداخت باید به تامین‌کننده‌ای که پیش‌پرداخت کرده انجام شود.");
      return;
    }

    const nextAmount = BigInt(normalized);
    if (nextAmount > maxAmount) {
      toast.error(
        kind === "ADVANCE"
          ? "مبلغ پیش‌پرداخت از باقیمانده تامین هزینه بیشتر است."
          : "مبلغ پرداخت از باقیمانده سهم بیشتر است.",
      );
      return;
    }

    onSave({
      amount: normalized,
      paymentDate,
      attachment: attachment[0],
      kind,
      payeeUserId: kind === "REIMBURSEMENT" ? payeeUserId : null,
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>نوع پرداخت</Label>
        <Select value={kind} onValueChange={(value) => setKind(value as FinancierPaymentKind)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["OWN_SHARE", "ADVANCE", "REIMBURSEMENT"] as FinancierPaymentKind[]).map((value) => (
              <SelectItem key={value} value={value} hint={FINANCIER_PAYMENT_KIND_HINTS[value]}>
                {FINANCIER_PAYMENT_KIND_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs leading-relaxed text-slate-500 dark:text-gh-fg-muted">
          {FINANCIER_PAYMENT_KIND_HINTS[kind]}
        </p>
      </div>
      {kind === "REIMBURSEMENT" && (
        <div className="space-y-2">
          <Label>دریافت‌کننده</Label>
          <Select value={payeeUserId || undefined} onValueChange={setPayeeUserId}>
            <SelectTrigger>
              <SelectValue placeholder="انتخاب تامین‌کننده" />
            </SelectTrigger>
            <SelectContent>
              {payeeOptions.map((item) => (
                <SelectItem key={item.userId} value={item.userId}>
                  {item.userName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label>مبلغ پرداخت</Label>
        <Input
          inputMode="numeric"
          value={amount ? formatCurrencyAmount(amount) : ""}
          onChange={(e) => setAmount(parseCurrencyAmount(e.target.value))}
          dir="ltr"
          className="text-start tabular-nums"
          placeholder="0"
          autoComplete="off"
        />
        <p className="text-xs text-slate-500 dark:text-gh-fg-muted" dir="ltr">
          حداکثر: {formatCurrencyAmount(maxAmount.toString())}
        </p>
      </div>
      <div className="space-y-2">
        <Label>تاریخ پرداخت</Label>
        <DualDatePicker value={paymentDate} onChange={setPaymentDate} />
      </div>
      <div className="space-y-2">
        <Label>سند پرداخت *</Label>
        <FileUpload value={attachment} onChange={(files) => setAttachment(files.slice(-1))} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={handleSave}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            انصراف
          </Button>
        )}
      </div>
    </div>
  );
}

export function FinancierSharePayments({
  expenseId,
  currency,
  expenseAmount,
  fundedAmount,
  fundingStatus,
  shares,
  mode,
  canManageShare,
  draftPaymentsByUserId = {},
  onDraftPaymentsChange,
  onExpenseUpdated,
}: FinancierSharePaymentsProps) {
  const [paymentModal, setPaymentModal] = useState<PaymentModalState>(null);
  const [saving, setSaving] = useState(false);

  const expenseAmountBig = BigInt((expenseAmount ?? "0").replace(/\D/g, "") || "0");
  const totalFunded = useMemo(() => {
    if (fundedAmount !== undefined) {
      return BigInt(fundedAmount.replace(/\D/g, "") || "0");
    }
    return sumExpenseFunding(
      shares.flatMap((share) =>
        share.payments.map((payment) => ({ amount: payment.amount, kind: payment.kind })),
      ),
    );
  }, [fundedAmount, shares]);

  const fundingProgress =
    expenseAmountBig > BigInt(0) ? Number((totalFunded * BigInt(100)) / expenseAmountBig) : 0;

  const sharesWithDraft = useMemo(() => {
    if (mode !== "draft") return shares;

    return shares.map((share) => {
      const draftPayments = draftPaymentsByUserId[share.userId] ?? [];
      const shareAmount = BigInt(share.amount.replace(/\D/g, "") || "0");
      const settled = sumSettledOnShare(
        draftPayments.map((payment) => ({ amount: payment.amount, kind: payment.kind })),
      );
      const remainingAmount = settled >= shareAmount ? BigInt(0) : shareAmount - settled;

      return {
        ...share,
        paidAmount: settled.toString(),
        remainingAmount: remainingAmount.toString(),
        status:
          settled <= BigInt(0)
            ? ("unpaid" as const)
            : settled >= shareAmount
              ? ("paid" as const)
              : ("partial" as const),
        payments: draftPayments.map((payment) => ({
          id: payment.id,
          amount: payment.amount,
          kind: payment.kind,
          paymentDate: toGregorianString(payment.paymentDate),
          paymentDateJalali: gregorianToJalali(toGregorianString(payment.paymentDate)),
          payeeUserId: payment.payeeUserId ?? null,
          payeeUserName:
            shares.find((item) => item.userId === payment.payeeUserId)?.userName ?? null,
          attachment: {
            id: payment.attachment.id,
            fileName: payment.attachment.fileName,
            mimeType: payment.attachment.mimeType,
            sizeBytes: payment.attachment.sizeBytes ?? 0,
            url: payment.attachment.url,
          },
          createdAt: "",
        })),
      };
    });
  }, [draftPaymentsByUserId, mode, shares]);

  const displayShares = mode === "draft" ? sharesWithDraft : shares;

  const handleDraftAdd = (userId: string, values: PaymentFormValues) => {
    const current = draftPaymentsByUserId[userId] ?? [];
    onDraftPaymentsChange?.(userId, [
      ...current,
      {
        id: crypto.randomUUID(),
        amount: values.amount,
        paymentDate: values.paymentDate,
        attachment: values.attachment,
        kind: values.kind,
        payeeUserId: values.payeeUserId,
      },
    ]);
    setPaymentModal(null);
  };

  const handleDraftUpdate = (userId: string, paymentId: string, values: PaymentFormValues) => {
    const current = draftPaymentsByUserId[userId] ?? [];
    onDraftPaymentsChange?.(
      userId,
      current.map((payment) =>
        payment.id === paymentId
          ? {
              ...payment,
              amount: values.amount,
              paymentDate: values.paymentDate,
              attachment: values.attachment,
              kind: values.kind,
              payeeUserId: values.payeeUserId,
            }
          : payment,
      ),
    );
    setPaymentModal(null);
  };

  const handleDraftDelete = (userId: string, paymentId: string) => {
    const current = draftPaymentsByUserId[userId] ?? [];
    onDraftPaymentsChange?.(
      userId,
      current.filter((payment) => payment.id !== paymentId),
    );
  };

  const handleLiveAdd = async (share: ExpenseFinancierShareDTO, values: PaymentFormValues) => {
    if (!expenseId) return;
    setSaving(true);
    const res = await fetch(`/api/expenses/${expenseId}/financier-shares/${share.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: values.amount,
        paymentDate: toGregorianString(values.paymentDate),
        attachmentId: values.attachment.id,
        kind: values.kind,
        payeeUserId: values.payeeUserId,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "خطا در ثبت پرداخت");
      return;
    }

    toast.success("پرداخت ثبت شد.");
    setPaymentModal(null);
    onExpenseUpdated?.(await res.json());
  };

  const handleLiveUpdate = async (
    share: ExpenseFinancierShareDTO,
    payment: FinancierSharePaymentDTO,
    values: PaymentFormValues,
  ) => {
    if (!expenseId) return;
    setSaving(true);
    const res = await fetch(
      `/api/expenses/${expenseId}/financier-shares/${share.id}/payments/${payment.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: values.amount,
          paymentDate: toGregorianString(values.paymentDate),
          attachmentId: values.attachment.id,
          kind: values.kind,
          payeeUserId: values.payeeUserId,
        }),
      },
    );
    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "خطا در ویرایش پرداخت");
      return;
    }

    toast.success("پرداخت به‌روزرسانی شد.");
    setPaymentModal(null);
    onExpenseUpdated?.(await res.json());
  };

  const handleLiveDelete = async (share: ExpenseFinancierShareDTO, paymentId: string) => {
    if (!expenseId || !confirm("آیا از حذف این پرداخت مطمئن هستید؟")) return;
    setSaving(true);
    const res = await fetch(
      `/api/expenses/${expenseId}/financier-shares/${share.id}/payments/${paymentId}`,
      { method: "DELETE" },
    );
    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "خطا در حذف پرداخت");
      return;
    }

    toast.success("پرداخت حذف شد.");
    onExpenseUpdated?.(await res.json());
  };

  if (!displayShares.length) {
    return <p className="text-sm text-slate-500 dark:text-gh-fg-muted">تامین‌کننده‌ای تعریف نشده است.</p>;
  }

  return (
    <div className="space-y-4">
      {expenseAmount && (
        <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-gh-border">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">تامین هزینه</p>
            {fundingStatus && (
              <span className={cn("rounded-md px-2 py-0.5 text-xs", fundingClasses[fundingStatus])}>
                {fundingLabels[fundingStatus]}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-gh-fg-muted" dir="ltr">
            {formatExpenseMoney(totalFunded.toString(), currency)} /{" "}
            {formatExpenseMoney(expenseAmount, currency)}
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-gh-neutral">
            <div
              className="h-full rounded-full bg-sky-500 transition-all"
              style={{ width: `${Math.min(fundingProgress, 100)}%` }}
            />
          </div>
        </div>
      )}

      {displayShares.map((share) => {
        const shareAmount = BigInt(share.amount.replace(/\D/g, "") || "0");
        const paidAmount = BigInt(share.paidAmount.replace(/\D/g, "") || "0");
        const remainingAmount = BigInt(share.remainingAmount.replace(/\D/g, "") || "0");
        const fundingRemaining = expenseAmountBig - totalFunded;
        const progress = shareAmount > BigInt(0) ? Number((paidAmount * BigInt(100)) / shareAmount) : 0;
        const manageable = canManageShare(share);
        const canAddPayment =
          manageable && (remainingAmount > BigInt(0) || fundingRemaining > BigInt(0));

        return (
          <div
            key={share.id || share.userId}
            className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-gh-border"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium">{share.userName}</p>
                <p className="text-xs text-slate-500 dark:text-gh-fg-muted" dir="ltr">
                  {formatExpenseMoney(share.paidAmount, currency)} / {formatExpenseMoney(share.amount, currency)}
                </p>
                {share.creditorUserName && remainingAmount > BigInt(0) && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    بدهی به: {share.creditorUserName}
                  </p>
                )}
              </div>
              <span className={cn("rounded-md px-2 py-0.5 text-xs", statusClasses[share.status])}>
                {statusLabels[share.status]}
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-gh-neutral">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>

            {share.payments.length > 0 && (
              <div className="space-y-2">
                {share.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="rounded-md border border-slate-100 px-3 py-2 text-sm dark:border-gh-border"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p dir="ltr" className="font-medium">
                          {formatExpenseMoney(payment.amount, currency)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-gh-fg-muted">
                          {FINANCIER_PAYMENT_KIND_LABELS[payment.kind]}
                          {payment.payeeUserName ? ` → ${payment.payeeUserName}` : ""}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-gh-fg-muted">
                          {payment.paymentDateJalali || payment.paymentDate}
                        </p>
                        {payment.attachment && <PaymentDocumentLink attachment={payment.attachment} />}
                      </div>
                      {manageable && (
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={saving}
                            onClick={() =>
                              setPaymentModal({ mode: "edit", share, payment })
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={saving}
                            onClick={() =>
                              mode === "draft"
                                ? handleDraftDelete(share.userId, payment.id)
                                : handleLiveDelete(share, payment.id)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {canAddPayment && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={() => setPaymentModal({ mode: "add", share })}
              >
                <Plus className="h-4 w-4" />
                افزودن پرداخت
              </Button>
            )}
          </div>
        );
      })}

      <Dialog open={paymentModal !== null} onOpenChange={(open) => !open && setPaymentModal(null)}>
        <DialogContent className={paymentDialogClassName}>
          {paymentModal && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {paymentModal.mode === "add"
                    ? `افزودن پرداخت — ${paymentModal.share.userName}`
                    : `ویرایش پرداخت — ${paymentModal.share.userName}`}
                </DialogTitle>
              </DialogHeader>
              <SharePaymentForm
                share={paymentModal.share}
                shares={displayShares}
                expenseAmount={expenseAmountBig}
                totalFunded={totalFunded}
                excludePaymentAmount={
                  paymentModal.mode === "edit"
                    ? BigInt(paymentModal.payment.amount.replace(/\D/g, "") || "0")
                    : undefined
                }
                initial={
                  paymentModal.mode === "edit"
                    ? {
                        amount: paymentModal.payment.amount,
                        paymentDate: new Date(paymentModal.payment.paymentDate),
                        attachment: paymentModal.payment.attachment ?? undefined,
                        kind: paymentModal.payment.kind,
                        payeeUserId: paymentModal.payment.payeeUserId,
                      }
                    : undefined
                }
                submitLabel={
                  paymentModal.mode === "add"
                    ? mode === "draft"
                      ? "افزودن پرداخت"
                      : "ثبت پرداخت"
                    : "ذخیره تغییرات"
                }
                onCancel={() => setPaymentModal(null)}
                onSave={(values) => {
                  if (paymentModal.mode === "add") {
                    if (mode === "draft") {
                      handleDraftAdd(paymentModal.share.userId, values);
                    } else {
                      void handleLiveAdd(paymentModal.share, values);
                    }
                    return;
                  }
                  if (mode === "draft") {
                    handleDraftUpdate(
                      paymentModal.share.userId,
                      paymentModal.payment.id,
                      values,
                    );
                    return;
                  }
                  void handleLiveUpdate(paymentModal.share, paymentModal.payment, values);
                }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
