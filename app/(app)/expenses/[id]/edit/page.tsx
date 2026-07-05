"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExpenseForm } from "@/components/expense-form";
import { ExpenseDTO } from "@/lib/dto";
import { toGregorianString } from "@/lib/dates";

export default function EditExpensePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [expense, setExpense] = useState<ExpenseDTO | null>(null);

  useEffect(() => {
    fetch(`/api/expenses/${id}`)
      .then((r) => r.json())
      .then(setExpense);
  }, [id]);

  if (!expense) {
    return <p className="text-sm text-slate-500">در حال بارگذاری...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">ویرایش هزینه</h1>
          <p className="text-sm text-slate-500">به‌روزرسانی اطلاعات فاکتور</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/expenses/${id}`}>انصراف</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">فرم ویرایش</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseForm
            expenseId={id}
            expenseAddedByUserId={expense.addedByUserId}
            submitLabel="ذخیره تغییرات"
            loadingLabel="در حال ذخیره..."
            requireNewFiles={false}
            initial={{
              costFactorTypeId: expense.costFactorTypeId,
              addedByUserId: expense.addedByUserId,
              amount: expense.amount,
              currency: expense.currency,
              description: expense.description ?? "",
              factorDate: new Date(expense.factorDate),
              files: [],
              financierShares: expense.financierShares,
            }}
            onSubmit={async (values) => {
              if (!values.factorDate) return false;

              const res = await fetch(`/api/expenses/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  costFactorTypeId: values.costFactorTypeId,
                  addedByUserId: values.addedByUserId,
                  amount: values.amount,
                  currency: values.currency,
                  description: values.description || null,
                  factorDate: toGregorianString(values.factorDate),
                  attachmentIds: values.files.map((f) => f.id),
                  financierShares: values.financierShares,
                }),
              });

              if (!res.ok) {
                const data = await res.json();
                toast.error(data.error ?? "خطا در ویرایش هزینه");
                return false;
              }

              toast.success("هزینه به‌روزرسانی شد.");
              router.push(`/expenses/${id}`);
              return true;
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
