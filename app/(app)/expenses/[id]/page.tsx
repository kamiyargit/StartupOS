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
import {
  FileText,
  ImageIcon,
  Pencil,
  Trash2,
  ArrowRight,
  Calendar,
  User,
  Hash,
  Paperclip,
} from "lucide-react";

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
    session?.user?.role === "ADMIN" || session?.user?.id === expense?.addedByUserId;

  const canManageShare = (share: ExpenseDTO["financierShares"][number]) => {
    if (!session?.user?.id || !expense) return false;
    if (session.user.role === "ADMIN") return true;
    if (expense.addedByUserId === session.user.id) return true;
    if (share.userId === session.user.id) return true;
    return false;
  };

  const onDelete = async () => {
    if (!confirm("آیا از حذف این هزینه مطمئن هستید؟")) return;
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
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {expense.attachments.map((a) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group overflow-hidden rounded-lg border border-slate-200 transition hover:border-emerald-400 dark:border-gh-border dark:hover:border-emerald-600"
            >
              {a.mimeType.startsWith("image/") ? (
                <div className="aspect-video bg-slate-100 dark:bg-gh-neutral">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.url}
                    alt={a.fileName}
                    className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                  />
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center bg-slate-50 dark:bg-gh-neutral">
                  <FileText className="h-12 w-12 text-emerald-600" />
                </div>
              )}
              <div className="flex items-center gap-2 border-t border-slate-100 p-3 dark:border-gh-border">
                {a.mimeType.startsWith("image/") ? (
                  <ImageIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-emerald-600" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.fileName}</p>
                  <p className="text-xs text-slate-500 dark:text-gh-fg-muted">{formatBytes(a.sizeBytes)}</p>
                </div>
              </div>
            </a>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
