"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/pagination";
import { IncomeRecordDTO, InvoiceDTO, PaginatedResponse } from "@/lib/dto";
import { formatExpenseMoney } from "@/lib/currency";
import { INVOICE_STATUS_LABELS, nextInvoiceActions } from "@/lib/invoice-workflow";
import { cn } from "@/lib/utils";

const STATUS_ACTION_LABELS: Partial<Record<InvoiceDTO["status"], string>> = {
  SENT: "علامت‌گذاری ارسال",
  PAID: "ثبت پرداخت",
  OVERDUE: "سررسید گذشته",
  CANCELLED: "لغو",
};

function InvoiceStatusBadge({ status }: { status: InvoiceDTO["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        status === "PAID" && "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400",
        status === "SENT" && "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
        status === "OVERDUE" && "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
        status === "DRAFT" && "bg-slate-100 text-slate-600 dark:bg-gh-neutral dark:text-gh-fg-muted",
        status === "CANCELLED" && "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
      )}
    >
      {INVOICE_STATUS_LABELS[status]}
    </span>
  );
}

export default function IncomePage() {
  const [records, setRecords] = useState<IncomeRecordDTO[]>([]);
  const [invoices, setInvoices] = useState<InvoiceDTO[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [invoiceTotalPages, setInvoiceTotalPages] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback((p = 1, invPage = 1) => {
    Promise.all([
      fetch(`/api/income?page=${p}&pageSize=10`).then((r) => r.json()),
      fetch(`/api/invoices?page=${invPage}&pageSize=10`).then((r) => r.json()),
    ]).then(([incomeData, allInvoices]: [PaginatedResponse<IncomeRecordDTO>, PaginatedResponse<InvoiceDTO>]) => {
      setRecords(incomeData.items ?? []);
      setTotal(incomeData.total ?? 0);
      setTotalPages(incomeData.totalPages ?? 1);
      setPage(incomeData.page ?? p);
      setInvoices(allInvoices.items ?? []);
      setInvoiceTotal(allInvoices.total ?? 0);
      setInvoiceTotalPages(allInvoices.totalPages ?? 1);
      setInvoicePage(allInvoices.page ?? invPage);
    });
  }, []);

  useEffect(() => {
    load(1, 1);
  }, [load]);

  const updateInvoiceStatus = async (invoiceId: string, status: InvoiceDTO["status"]) => {
    setUpdatingId(invoiceId);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "خطا در به‌روزرسانی فاکتور");
        return;
      }
      toast.success(`وضعیت فاکتور به «${INVOICE_STATUS_LABELS[status]}» تغییر کرد.`);
      if (status === "PAID") {
        toast.success("رکورد درآمد به‌صورت خودکار ثبت شد.");
      }
      load(page, invoicePage);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">مدیریت درآمد</h1>
          <p className="text-sm text-slate-500">ثبت درآمد، فاکتور و مطالبات</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/income/invoices/new">
              <FileText className="h-4 w-4" />
              فاکتور جدید
            </Link>
          </Button>
          <Button asChild>
            <Link href="/income/new">
              <Plus className="h-4 w-4" />
              ثبت درآمد
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">فاکتورها</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-slate-500">فاکتوری ثبت نشده است.</p>
          ) : (
            <>
              <div className="space-y-2">
                {invoices.map((inv) => {
                  const actions = nextInvoiceActions(inv.status);
                  return (
                    <div
                      key={inv.id}
                      className="flex flex-col gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm dark:border-gh-border sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{inv.number}</p>
                          <InvoiceStatusBadge status={inv.status} />
                        </div>
                        <p className="text-xs text-slate-500">
                          {inv.sourceName ?? "—"} · صدور {inv.issueDateJalali} · سررسید {inv.dueDateJalali}
                        </p>
                        {inv.incomeId && (
                          <p className="mt-0.5 text-xs text-primary-600 dark:text-primary-400">درآمد مرتبط ثبت شده</p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span dir="ltr" className="font-semibold">
                          {formatExpenseMoney(inv.subtotal, inv.currency)}
                        </span>
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer">
                            PDF
                          </a>
                        </Button>
                        {actions.map((action) => (
                          <Button
                            key={action}
                            variant={action === "CANCELLED" ? "outline" : "secondary"}
                            size="sm"
                            disabled={updatingId === inv.id}
                            onClick={() => updateInvoiceStatus(inv.id, action)}
                          >
                            {STATUS_ACTION_LABELS[action] ?? INVOICE_STATUS_LABELS[action]}
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <Pagination
                page={invoicePage}
                totalPages={invoiceTotalPages}
                total={invoiceTotal}
                pageSize={10}
                onPageChange={(p) => load(page, p)}
                className="mt-4"
              />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">رکوردهای درآمد</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-slate-500">درآمدی ثبت نشده است.</p>
          ) : (
            <>
              <div className="space-y-2">
                {records.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-gh-border"
                  >
                    <div>
                      <p className="font-medium">{r.sourceName ?? r.description ?? "درآمد"}</p>
                      <p className="text-xs text-slate-500">
                        {r.incomeDateJalali} · {r.paymentStatus}
                      </p>
                    </div>
                    <span dir="ltr" className="font-semibold">
                      {formatExpenseMoney(r.amount, r.currency)}
                    </span>
                  </div>
                ))}
              </div>
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                pageSize={10}
                onPageChange={(p) => load(p, invoicePage)}
                className="mt-4"
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
