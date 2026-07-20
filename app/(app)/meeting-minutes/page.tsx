"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Eye, Search } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/pagination";
import { MeetingMinutesDTO, PaginatedResponse } from "@/lib/dto";
import { meetingMinutesStatusLabel } from "@/lib/meeting-minutes-labels";
import { cn } from "@/lib/utils";
import { isAdminRole } from "@/lib/deployment-client";

export default function MeetingMinutesPage() {
  const { data: session } = useSession();
  const isAdmin = isAdminRole(session?.user?.role ?? "");
  const [items, setItems] = useState<MeetingMinutesDTO[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    (targetPage = page) => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(targetPage), pageSize: String(pageSize) });
      if (q) params.set("q", q);
      fetch(`/api/meeting-minutes?${params}`)
        .then((r) => r.json())
        .then((data: PaginatedResponse<MeetingMinutesDTO>) => {
          setItems(data.items ?? []);
          setTotal(data.total ?? 0);
          setTotalPages(data.totalPages ?? 1);
          setPage(data.page ?? targetPage);
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

  const statusClass = (status: MeetingMinutesDTO["status"]) =>
    cn(
      "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
      status === "APPROVED"
        ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400"
        : "bg-amber-50 text-amber-700 dark:bg-[#3d2e00] dark:text-[#d29922]",
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">صورتجلسات هیئت‌مدیره</h1>
          <p className="text-sm text-slate-500 dark:text-gh-fg-muted">آرشیو صورتجلسات تأییدشده</p>
        </div>
        {isAdmin && (
          <Button asChild className="w-full sm:w-auto">
            <Link href="/meeting-minutes/new">ثبت صورتجلسه</Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="ps-9"
                placeholder="جستجو در موضوع، حاضرین، خلاصه..."
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
          {loading ? (
            <p className="text-sm text-slate-500 dark:text-gh-fg-muted">در حال بارگذاری...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-gh-fg-muted">صورتجلسه‌ای ثبت نشده است.</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-200 p-4 dark:border-gh-border"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="font-medium leading-snug">{item.subject}</p>
                      <span className={statusClass(item.status)}>
                        {meetingMinutesStatusLabel(item.status)}
                      </span>
                    </div>
                    <p className="mb-3 text-sm text-slate-500 dark:text-gh-fg-muted">
                      {item.meetingDateJalali}
                    </p>
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link href={`/meeting-minutes/${item.id}`}>
                        <Eye className="h-4 w-4" />
                        مشاهده
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-slate-500 dark:text-gh-fg-muted">
                      <th className="py-3 text-start font-medium">تاریخ جلسه</th>
                      <th className="py-3 text-start font-medium">موضوع</th>
                      <th className="py-3 text-start font-medium">وضعیت</th>
                      <th className="py-3 text-start font-medium">عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 dark:border-gh-border">
                        <td className="py-3">{item.meetingDateJalali}</td>
                        <td className="max-w-xs truncate py-3">{item.subject}</td>
                        <td className="py-3">
                          <span className={statusClass(item.status)}>
                            {meetingMinutesStatusLabel(item.status)}
                          </span>
                        </td>
                        <td className="py-3">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/meeting-minutes/${item.id}`}>
                              <Eye className="h-4 w-4" />
                              مشاهده
                            </Link>
                          </Button>
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
                onPageChange={(p) => load(p)}
                className="mt-4"
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
