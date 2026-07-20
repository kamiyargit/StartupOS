"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CostTypeBadge } from "@/components/cost-type-badge";
import { FinancierSharePayments } from "@/components/financier-share-payments";
import { ExpenseDTO } from "@/lib/dto";
import { formatExpenseMoney, currencySymbol } from "@/lib/currency";
import { formatBytes, formatDateTimeFa } from "@/lib/format";
import { AttachmentGrid } from "@/components/attachment-viewer";
import { Pencil, Trash2, ArrowRight, Calendar, User, Hash, Paperclip } from "lucide-react";
import { isAdminRole } from "@/lib/deployment-client";

export default function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const [expense, setExpense] = useState<ExpenseDTO | null>(null);

  useEffect(() => {
    fetch(`/api/expenses/${id}`)
      .then((r) => r.json())
      .then(setExpense);
  }, [id]);

  const canModify =
    isAdminRole(session?.user?.role ?? "") || session?.user?.id === expense?.addedByUserId;

  const canManageShare = (share: ExpenseDTO["financierShares"][number]) => {
    if (!session?.user?.id || !expense) return false;
    if (isAdminRole(session.user.role)) return true;
    if (expense.addedByUserId === session.user.id) return true;
    if (share.userId === session.user.id) return true;
    return false;
  };

  const onDelete = async () => {
    if (!confirm("این هزینه آرشیو شود؟ (حذف امن — داده‌ها حفظ می‌شوند)")) return;
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("خطا در حذف");
      return;
    }
    toast.success("حذف شد.");
    router.push("/expenses");
  };

  if (!expense) {
    return <p className="text-sm text-slate-500 dark:text-gh-fg-muted">در حال بارگذاری...</p>;
  }

  const totalAttachmentSize = expense.attachments.reduce((s, a) => s + a.sizeBytes, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold sm:text-2xl">جزئیات هزینه</h1>
            <CostTypeBadge
              name={expense.costFactorTypeName}
              color={expense.costFactorTypeColor}
              size="md"
            />
          </div>
          <p className="text-sm text-slate-500 dark:text-gh-fg-muted" dir="ltr">
            شناسه: {expense.id}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/expenses">
              <ArrowRight className="h-4 w-4" />
              بازگشت
            </Link>
          </Button>
          {canModify && (
            <>
              <Button variant="secondary" asChild>
                <Link href={`/expenses/${id}/edit`}>
                  <Pencil className="h-4 w-4" />
                  ویرایش
                </Link>
              </Button>
              <Button variant="destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
                حذف
              </Button>
            </>
          )}
        </div>
      </div>

      <div
        className="rounded-xl border border-slate-200 p-4 dark:border-gh-border sm:p-6"
        style={{ borderInlineStartWidth: 4, borderInlineStartColor: expense.costFactorTypeColor }}
      >
        <p className="text-sm text-slate-500 dark:text-gh-fg-muted">مبلغ فاکتور</p>
        <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-gh-fg sm:text-3xl" dir="ltr">
          {formatExpenseMoney(expense.amount, expense.currency)}
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-gh-fg-muted">واحد: {currencySymbol(expense.currency)}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-gh-fg-muted">
              <Calendar className="h-4 w-4" />
              تاریخ فاکتور
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="font-medium">{expense.factorDateJalali}</p>
            <p className="text-sm text-slate-500 dark:text-gh-fg-muted" dir="ltr">
              {expense.factorDate}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-gh-fg-muted">
              <User className="h-4 w-4" />
              ثبت‌کننده
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{expense.addedByName}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-gh-fg-muted">
              <Hash className="h-4 w-4" />
              زمان ثبت
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-slate-500 dark:text-gh-fg-muted">ایجاد: </span>
              {formatDateTimeFa(expense.createdAt)}
            </p>
            <p>
              <span className="text-slate-500 dark:text-gh-fg-muted">آخرین ویرایش: </span>
              {formatDateTimeFa(expense.updatedAt)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-gh-fg-muted">
              <Paperclip className="h-4 w-4" />
              پیوست‌ها
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-medium">{expense.attachments.length} فایل</p>
            <p className="text-slate-500 dark:text-gh-fg-muted">حجم کل: {formatBytes(totalAttachmentSize)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">توضیحات</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-slate-700 dark:text-gh-fg-emphasis">{expense.description ?? "—"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">سهم تامین‌کنندگان</CardTitle>
        </CardHeader>
        <CardContent>
          <FinancierSharePayments
            expenseId={expense.id}
            currency={expense.currency}
            expenseAmount={expense.amount}
            fundedAmount={expense.fundedAmount}
            fundingStatus={expense.fundingStatus}
            shares={expense.financierShares}
            mode="live"
            canManageShare={canManageShare}
            onExpenseUpdated={setExpense}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">فاکتورها و پیوست‌ها</CardTitle>
        </CardHeader>
        <CardContent>
          {expense.attachments.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-gh-fg-muted">پیوستی ثبت نشده است.</p>
          ) : (
            <AttachmentGrid attachments={expense.attachments} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
