"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Pencil, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CostTypeBadge } from "@/components/cost-type-badge";
import { Pagination } from "@/components/pagination";
import { ExpenseDTO, PaginatedResponse } from "@/lib/dto";
import { formatExpenseMoney } from "@/lib/currency";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseDTO[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(
    (targetPage = page) => {
      setLoading(true);
      setLoadError(null);
      const params = new URLSearchParams({ page: String(targetPage), pageSize: String(pageSize) });
      if (q) params.set("q", q);
      fetch(`/api/expenses?${params}`)
        .then(async (r) => {
          const data = await r.json();
          if (!r.ok) {
            throw new Error(typeof data?.error === "string" ? data.error : "خطا در بارگذاری هزینه‌ها");
          }
          if (!Array.isArray(data.items)) {
            throw new Error("پاسخ سرور نامعتبر است.");
          }
          return data as PaginatedResponse<ExpenseDTO>;
        })
        .then((data) => {
          setExpenses(data.items);
          setTotal(data.total);
          setTotalPages(data.totalPages);
          setPage(data.page);
        })
        .catch((error: unknown) => {
          setExpenses([]);
          setLoadError(error instanceof Error ? error.message : "خطا در بارگذاری هزینه‌ها");
        })
        .finally(() => setLoading(false));
    },
    [page, pageSize, q],
  );

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearch = () => {
    setPage(1);
    load(1);
  };

  const onPageChange = (nextPage: number) => {
    setPage(nextPage);
    load(nextPage);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">هزینه‌ها</h1>
          <p className="text-sm text-slate-500 dark:text-gh-fg-muted">لیست تمام فاکتورهای ثبت‌شده</p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/expenses/new">ثبت هزینه جدید</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="ps-9"
                placeholder="جستجو..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSearch()}
              />
            </div>
            <Button variant="outline" onClick={onSearch} className="w-full sm:w-auto">
              جستجو
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
          ) : loading ? (
            <p className="text-sm text-slate-500 dark:text-gh-fg-muted">در حال بارگذاری...</p>
          ) : expenses.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-gh-fg-muted">هزینه‌ای ثبت نشده است.</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {expenses.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-lg border border-slate-200 p-4 dark:border-gh-border"
                    style={{
                      borderInlineStartWidth: 3,
                      borderInlineStartColor: e.costFactorTypeColor,
                    }}
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <CostTypeBadge
                        name={e.costFactorTypeName}
                        color={e.costFactorTypeColor}
                        size="sm"
                      />
                      <span className="shrink-0 font-semibold tabular-nums">
                        <span dir="ltr" className="inline-block">
                          {formatExpenseMoney(e.amount, e.currency)}
                        </span>
                      </span>
                    </div>
                    <dl className="space-y-1 text-sm">
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500 dark:text-gh-fg-muted">تاریخ</dt>
                        <dd>{e.factorDateJalali}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500 dark:text-gh-fg-muted">ثبت‌کننده</dt>
                        <dd className="truncate">{e.addedByName}</dd>
                      </div>
                      {e.description && (
                        <div>
                          <dt className="text-slate-500 dark:text-gh-fg-muted">توضیحات</dt>
                          <dd className="mt-0.5 line-clamp-2 text-start text-slate-600 dark:text-gh-fg-emphasis">
                            {e.description}
                          </dd>
                        </div>
                      )}
                    </dl>
                    <div className="mt-3 flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <Link href={`/expenses/${e.id}`}>
                          <Eye className="h-4 w-4" />
                          جزئیات
                        </Link>
                      </Button>
                      <Button variant="secondary" size="sm" className="flex-1" asChild>
                        <Link href={`/expenses/${e.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                          ویرایش
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-slate-500 dark:text-gh-fg-muted">
                      <th className="py-3 text-start font-medium">تاریخ</th>
                      <th className="py-3 text-start font-medium">نوع</th>
                      <th className="py-3 text-start font-medium">ثبت‌کننده</th>
                      <th className="py-3 text-start font-medium">مبلغ</th>
                      <th className="py-3 text-start font-medium">توضیحات</th>
                      <th className="py-3 text-start font-medium">عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e) => (
                      <tr
                        key={e.id}
                        className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-gh-neutral/50"
                      >
                        <td className="py-3">{e.factorDateJalali}</td>
                        <td className="py-3">
                          <CostTypeBadge
                            name={e.costFactorTypeName}
                            color={e.costFactorTypeColor}
                            size="sm"
                          />
                        </td>
                        <td className="py-3">{e.addedByName}</td>
                        <td className="py-3 text-start font-medium tabular-nums">
                          <span dir="ltr" className="inline-block">
                            {formatExpenseMoney(e.amount, e.currency)}
                          </span>
                        </td>
                        <td className="max-w-xs py-3 text-start">
                          <p className="truncate text-slate-600 dark:text-gh-fg-emphasis">
                            {e.description ?? "—"}
                          </p>
                        </td>
                        <td className="py-3">
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/expenses/${e.id}`}>
                                <Eye className="h-4 w-4" />
                                جزئیات
                              </Link>
                            </Button>
                            <Button variant="secondary" size="sm" asChild>
                              <Link href={`/expenses/${e.id}/edit`}>
                                <Pencil className="h-4 w-4" />
                                ویرایش
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                pageSize={pageSize}
                onPageChange={onPageChange}
                className="mt-4"
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
