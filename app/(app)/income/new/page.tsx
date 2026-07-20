"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { ExpenseCurrency } from "@/lib/currency";
import { toGregorianString } from "@/lib/dates";

export default function NewIncomePage() {
  const router = useRouter();
  const [sources, setSources] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<ExpenseCurrency>("TOMAN");
  const [description, setDescription] = useState("");
  const [incomeDate, setIncomeDate] = useState<Date | null>(new Date());
  const [paymentStatus, setPaymentStatus] = useState("PENDING");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/income/sources").then((r) => r.json()).then((data) => {
      setSources(data.sources ?? []);
      setCategories(data.categories ?? []);
    });
  }, []);

  const save = async () => {
    if (!amount || !incomeDate) return;
    setSaving(true);
    const res = await fetch("/api/income", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceId: sourceId || null,
        categoryId: categoryId || null,
        amount,
        currency,
        description,
        incomeDate: toGregorianString(incomeDate),
        paymentStatus,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("خطا در ثبت درآمد");
      return;
    }
    toast.success("درآمد ثبت شد.");
    router.push("/income");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ثبت درآمد</h1>
        <Button variant="outline" asChild><Link href="/income">انصراف</Link></Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">فرم درآمد</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>منبع درآمد</Label>
              <Select value={sourceId || "none"} onValueChange={(v) => setSourceId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {sources.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>دسته</Label>
              <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>مبلغ *</Label>
            <CurrencyAmountInput amount={amount} currency={currency} onAmountChange={setAmount} onCurrencyChange={setCurrency} />
          </div>
          <div className="space-y-1">
            <Label>وضعیت پرداخت</Label>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">در انتظار</SelectItem>
                <SelectItem value="RECEIVED">دریافت شده</SelectItem>
                <SelectItem value="PARTIAL">جزئی</SelectItem>
                <SelectItem value="CANCELLED">لغو شده</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>توضیحات</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1">
            <Label>تاریخ *</Label>
            <DualDatePicker value={incomeDate} onChange={setIncomeDate} />
          </div>
          <Button onClick={save} disabled={saving || !amount} className="w-full">
            {saving ? "در حال ذخیره..." : "ثبت درآمد"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
