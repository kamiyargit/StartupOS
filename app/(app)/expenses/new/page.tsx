"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpenseForm } from "@/components/expense-form";
import { toGregorianString } from "@/lib/dates";

export default function NewExpensePage() {
  const router = useRouter();
  const { data: session } = useSession();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ثبت هزینه جدید</h1>
        <p className="text-sm text-slate-500">اطلاعات فاکتور را وارد کنید</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">فرم ثبت</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseForm
            submitLabel="ثبت هزینه"
            loadingLabel="در حال ثبت..."
            onSubmit={async (values) => {
              if (!values.factorDate) return false;

              const res = await fetch("/api/expenses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  costFactorTypeId: values.costFactorTypeId,
                  addedByUserId: values.addedByUserId || session?.user?.id,
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
                toast.error(data.error ?? "خطا در ثبت هزینه");
                return false;
              }

              toast.success("هزینه با موفقیت ثبت شد.");
              router.push("/expenses");
              return true;
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
