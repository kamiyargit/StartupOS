"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DualDatePicker } from "@/components/dual-date-picker";
import { CurrencyAmountInput } from "@/components/currency-amount-input";
import { FileUpload, UploadedFile } from "@/components/file-upload";
import {
  DraftFinancierPayment,
  FinancierSharePayments,
} from "@/components/financier-share-payments";
import { CostFactorTypeDTO, ExpenseDTO, ExpenseFinancierShareDTO, UserDTO } from "@/lib/dto";
import { ExpenseCurrency } from "@/lib/currency";
import { calculateFinancierAmounts } from "@/lib/financier-shares";
import { deriveSharePaymentStatus, sumSettledOnShare, sumExpenseFunding, deriveExpenseFundingStatus } from "@/lib/financier-payments";
import { toGregorianString } from "@/lib/dates";

export type ExpenseFormValues = {
  costFactorTypeId: string;
  addedByUserId: string;
  amount: string;
  currency: ExpenseCurrency;
  description: string;
  factorDate: Date | null;
  files: UploadedFile[];
  financierShares: {
    userId: string;
    amount: string;
    payments?: {
      amount: string;
      paymentDate: string;
      attachmentId: string;
      kind?: "OWN_SHARE" | "ADVANCE" | "REIMBURSEMENT";
      payeeUserId?: string | null;
    }[];
  }[];
};

type ExpenseFormProps = {
  expenseId?: string;
  expenseAddedByUserId?: string;
  initial?: Omit<Partial<ExpenseFormValues>, "financierShares"> & {
    financierShares?: ExpenseFinancierShareDTO[];
  };
  submitLabel: string;
  loadingLabel: string;
  requireNewFiles?: boolean;
  onSubmit: (values: ExpenseFormValues) => Promise<boolean>;
};

export function ExpenseForm({
  expenseId,
  expenseAddedByUserId,
  initial,
  submitLabel,
  loadingLabel,
  requireNewFiles = true,
  onSubmit,
}: ExpenseFormProps) {
  const { data: session, status: sessionStatus } = useSession();
  const [types, setTypes] = useState<CostFactorTypeDTO[]>([]);
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const [costFactorTypeId, setCostFactorTypeId] = useState(initial?.costFactorTypeId ?? "");
  const [addedByUserId, setAddedByUserId] = useState(initial?.addedByUserId ?? "");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [currency, setCurrency] = useState<ExpenseCurrency>(initial?.currency ?? "TOMAN");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [factorDate, setFactorDate] = useState<Date | null>(initial?.factorDate ?? new Date());
  const [files, setFiles] = useState<UploadedFile[]>(initial?.files ?? []);
  const [liveFinancierShares, setLiveFinancierShares] = useState<ExpenseFinancierShareDTO[]>(
    initial?.financierShares ?? [],
  );
  const [draftPaymentsByUserId, setDraftPaymentsByUserId] = useState<Record<string, DraftFinancierPayment[]>>(
    {},
  );
  const [baselineAmount] = useState(initial?.amount ?? "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionStatus === "loading") return;

    let cancelled = false;

    Promise.all([fetch("/api/cost-types"), fetch("/api/users")])
      .then(async ([typesRes, usersRes]) => {
        const typesData: CostFactorTypeDTO[] = await typesRes.json();
        const usersData: UserDTO[] = await usersRes.json();
        return {
          types: typesData.filter((x) => x.isActive),
          users: usersData.filter((x) => x.isActive),
        };
      })
      .then(({ types: activeTypes, users: activeUsers }) => {
        if (cancelled) return;

        setTypes(activeTypes);
        setUsers(activeUsers);

        if (initial?.addedByUserId) {
          if (activeUsers.some((u) => u.id === initial.addedByUserId)) {
            setAddedByUserId(initial.addedByUserId);
          }
        } else if (session?.user?.id && activeUsers.some((u) => u.id === session.user.id)) {
          setAddedByUserId(session.user.id);
        }

        if (initial?.costFactorTypeId && activeTypes.some((t) => t.id === initial.costFactorTypeId)) {
          setCostFactorTypeId(initial.costFactorTypeId);
        }

        setOptionsLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setOptionsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionStatus, session?.user?.id, initial?.addedByUserId, initial?.costFactorTypeId]);

  const selectedType = types.find((t) => t.id === costFactorTypeId);
  const financierUsers = users.filter((u) => u.isFinancier && Number(u.sharePercent) > 0);

  const financierShares = useMemo(() => {
    const normalizedAmount = amount.replace(/\D/g, "");
    const totalAmount = normalizedAmount ? BigInt(normalizedAmount) : BigInt(0);
    const amounts = calculateFinancierAmounts(
      totalAmount,
      financierUsers.map((u) => ({ userId: u.id, sharePercent: u.sharePercent })),
    );

    if (expenseId) {
      const liveByUserId = new Map(liveFinancierShares.map((share) => [share.userId, share]));
      const amountUnchanged =
        amount.replace(/\D/g, "") === baselineAmount.replace(/\D/g, "");
      return financierUsers.map((u) => {
        const existing = liveByUserId.get(u.id);
        const recalculatedAmount = (amounts.get(u.id) ?? BigInt(0)).toString();
        const shareAmount =
          amountUnchanged && existing ? existing.amount : recalculatedAmount;
        const shareAmountBig = BigInt(shareAmount.replace(/\D/g, "") || "0");
        const settled = existing
          ? sumSettledOnShare(
              existing.payments.map((payment) => ({ amount: payment.amount, kind: payment.kind })),
            )
          : BigInt(0);
        const remainingAmount =
          settled >= shareAmountBig ? BigInt(0) : shareAmountBig - settled;

        return {
          id: existing?.id ?? u.id,
          userId: u.id,
          userName: u.fullName,
          amount: shareAmount,
          paidAmount: settled.toString(),
          remainingAmount: remainingAmount.toString(),
          status: deriveSharePaymentStatus(shareAmountBig, settled),
          creditorUserId: existing?.creditorUserId ?? null,
          creditorUserName: existing?.creditorUserName ?? null,
          payments: existing?.payments ?? [],
        };
      });
    }

    return financierUsers.map((u) => {
      const shareAmount = (amounts.get(u.id) ?? BigInt(0)).toString();
      const sharePayments = draftPaymentsByUserId[u.id] ?? [];
      const settled = sumSettledOnShare(
        sharePayments.map((payment) => ({ amount: payment.amount, kind: payment.kind })),
      );
      const shareAmountBig = BigInt(shareAmount.replace(/\D/g, "") || "0");
      const remainingAmount =
        settled >= shareAmountBig ? BigInt(0) : shareAmountBig - settled;

      return {
        id: u.id,
        userId: u.id,
        userName: u.fullName,
        amount: shareAmount,
        paidAmount: settled.toString(),
        remainingAmount: remainingAmount.toString(),
        status: deriveSharePaymentStatus(shareAmountBig, settled),
        creditorUserId: null,
        creditorUserName: null,
        payments: [],
      };
    });
  }, [amount, baselineAmount, draftPaymentsByUserId, expenseId, financierUsers, liveFinancierShares]);

  const fundingMeta = useMemo(() => {
    const expenseAmountBig = BigInt(amount.replace(/\D/g, "") || "0");
    const funded = sumExpenseFunding(
      expenseId
        ? financierShares.flatMap((s) => s.payments.map((p) => ({ amount: p.amount, kind: p.kind })))
        : Object.values(draftPaymentsByUserId)
            .flat()
            .map((p) => ({ amount: p.amount, kind: p.kind })),
    );
    return {
      fundedAmount: funded.toString(),
      fundingStatus: deriveExpenseFundingStatus(expenseAmountBig, funded),
    };
  }, [amount, draftPaymentsByUserId, expenseId, financierShares]);

  const canManageShare = (share: ExpenseFinancierShareDTO) => {
    const creatorId = expenseAddedByUserId ?? addedByUserId;
    if (!session?.user?.id) return false;
    if (session.user.role === "ADMIN") return true;
    if (creatorId === session.user.id) return true;
    if (share.userId === session.user.id) return true;
    return false;
  };

  const handleExpenseUpdated = (expense: ExpenseDTO) => {
    setLiveFinancierShares(expense.financierShares);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!addedByUserId) {
      toast.error("ثبت‌کننده الزامی است.");
      return;
    }
    if (!costFactorTypeId) {
      toast.error("نوع هزینه الزامی است.");
      return;
    }
    if (!amount || amount === "0") {
      toast.error("مبلغ الزامی است.");
      return;
    }
    if (!factorDate) {
      toast.error("تاریخ فاکتور الزامی است.");
      return;
    }
    if (requireNewFiles && !files.length) {
      toast.error("حداقل یک فاکتور آپلود کنید.");
      return;
    }

    setLoading(true);
    await onSubmit({
      costFactorTypeId,
      addedByUserId,
      amount,
      currency,
      description,
      factorDate,
      files,
      financierShares: financierShares.map((item) => ({
        userId: item.userId,
        amount: item.amount,
        ...(expenseId
          ? {}
          : {
              payments: (draftPaymentsByUserId[item.userId] ?? []).map((payment) => ({
                amount: payment.amount,
                paymentDate: toGregorianString(payment.paymentDate),
                attachmentId: payment.attachment.id,
                kind: payment.kind,
                payeeUserId: payment.payeeUserId,
              })),
            }),
      })),
    });
    setLoading(false);
  };

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await handleSubmit(e);
      }}
      className="space-y-5"
    >
      <div className="space-y-2">
        <Label>ثبت‌کننده *</Label>
        {!optionsLoaded ? (
          <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 dark:border-gh-border dark:bg-gh-canvas-inset dark:text-gh-fg-muted">
            در حال بارگذاری...
          </div>
        ) : (
          <Select value={addedByUserId} onValueChange={setAddedByUserId}>
            <SelectTrigger>
              <SelectValue placeholder="انتخاب کاربر" />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-2">
        <Label>نوع هزینه *</Label>
        {!optionsLoaded ? (
          <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 dark:border-gh-border dark:bg-gh-canvas-inset dark:text-gh-fg-muted">
            در حال بارگذاری...
          </div>
        ) : (
          <Select value={costFactorTypeId} onValueChange={setCostFactorTypeId}>
            <SelectTrigger className="gap-2">
              {selectedType && (
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: selectedType.color }}
                  aria-hidden
                />
              )}
              <SelectValue placeholder="انتخاب نوع" className="min-w-0 flex-1" />
            </SelectTrigger>
            <SelectContent>
              {types.map((t) => (
                <SelectItem key={t.id} value={t.id} dotColor={t.color}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-2">
        <Label>مبلغ *</Label>
        <CurrencyAmountInput
          amount={amount ?? ""}
          currency={currency ?? "TOMAN"}
          onAmountChange={setAmount}
          onCurrencyChange={setCurrency}
        />
      </div>

      <div className="space-y-2">
        <Label>سهم تامین‌کنندگان</Label>
        <FinancierSharePayments
          expenseId={expenseId}
          currency={currency}
          expenseAmount={amount}
          fundedAmount={fundingMeta.fundedAmount}
          fundingStatus={fundingMeta.fundingStatus}
          shares={financierShares}
          mode={expenseId ? "live" : "draft"}
          canManageShare={canManageShare}
          draftPaymentsByUserId={draftPaymentsByUserId}
          onDraftPaymentsChange={(userId, payments) =>
            setDraftPaymentsByUserId((prev) => ({ ...prev, [userId]: payments }))
          }
          onExpenseUpdated={handleExpenseUpdated}
        />
      </div>

      <div className="space-y-2">
        <Label>توضیحات</Label>
        <Textarea
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>تاریخ فاکتور *</Label>
        <DualDatePicker value={factorDate} onChange={setFactorDate} />
      </div>

      <div className="space-y-2">
        <Label>{requireNewFiles ? "فاکتور (تصویر / PDF) *" : "افزودن فاکتور جدید"}</Label>
        <FileUpload value={files} onChange={setFiles} />
        {!requireNewFiles && files.length > 0 && (
          <p className="text-xs text-slate-500">فایل‌های قبلی در بخش جزئیات نمایش داده می‌شوند.</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? loadingLabel : submitLabel}
      </Button>
    </form>
  );
}
