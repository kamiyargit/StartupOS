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
import { ExpenseCurrency } from "@/lib/currency";
import { toGregorianString } from "@/lib/dates";

type LineItem = { description: string; quantity: string; unitPrice: string };

export default function NewInvoicePage() {
  const router = useRouter();
  const [sources, setSources] = useState<{ id: string; name: string }[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [currency, setCurrency] = useState<ExpenseCurrency>("TOMAN");
  const [issueDate, setIssueDate] = useState<Date | null>(new Date());
  const [dueDate, setDueDate] = useState<Date | null>(new Date());
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: "", quantity: "1", unitPrice: "" }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/income/sources").then((r) => r.json()).then((d) => setSources(d.sources ?? []));
  }, []);

  const save = async () => {
    if (!issueDate || !dueDate || lineItems.some((li) => !li.description || !li.unitPrice)) return;
    setSaving(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceId: sourceId || null,
        currency,
        issueDate: toGregorianString(issueDate),
        dueDate: toGregorianString(dueDate),
        status: "DRAFT",
        notes,
        lineItems,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("خطا در ایجاد فاکتور");
      return;
    }
    toast.success("فاکتور ایجاد شد.");
    router.push("/income");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">فاکتور جدید</h1>
        <Button variant="outline" asChild><Link href="/income">انصراف</Link></Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">اطلاعات فاکتور</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>مشتری</Label>
            <Select value={sourceId || "none"} onValueChange={(v) => setSourceId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {sources.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>تاریخ صدور</Label>
              <DualDatePicker value={issueDate} onChange={setIssueDate} />
            </div>
            <div className="space-y-1">
              <Label>سررسید</Label>
              <DualDatePicker value={dueDate} onChange={setDueDate} />
            </div>
          </div>
          {lineItems.map((li, i) => (
            <div key={i} className="grid gap-2 rounded border border-slate-200 p-3 sm:grid-cols-3 dark:border-gh-border">
              <Input placeholder="شرح" value={li.description} onChange={(e) => {
                const next = [...lineItems];
                next[i] = { ...li, description: e.target.value };
                setLineItems(next);
              }} />
              <Input placeholder="تعداد" value={li.quantity} dir="ltr" onChange={(e) => {
                const next = [...lineItems];
                next[i] = { ...li, quantity: e.target.value };
                setLineItems(next);
              }} />
              <Input placeholder="قیمت واحد" value={li.unitPrice} dir="ltr" onChange={(e) => {
                const next = [...lineItems];
                next[i] = { ...li, unitPrice: e.target.value };
                setLineItems(next);
              }} />
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => setLineItems([...lineItems, { description: "", quantity: "1", unitPrice: "" }])}>
            + قلم
          </Button>
          <div className="space-y-1">
            <Label>یادداشت</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? "در حال ذخیره..." : "ایجاد فاکتور"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
