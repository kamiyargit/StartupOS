"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AppSettingsDTO } from "@/lib/dto";
import { currentJalaliMonth } from "@/lib/dates";
import { useAppSettings } from "@/components/app-settings-provider";

export default function AppSettingsPanel() {
  const { refresh } = useAppSettings();
  const [settings, setSettings] = useState<AppSettingsDTO | null>(null);
  const [minJalaliYear, setMinJalaliYear] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: AppSettingsDTO) => {
        setSettings(data);
        setMinJalaliYear(String(data.minJalaliYear));
      });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minJalaliYear: Number(minJalaliYear) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "خطا در ذخیره تنظیمات");
        return;
      }
      setSettings(data);
      setMinJalaliYear(String(data.minJalaliYear));
      await refresh();
      toast.success("تنظیمات ذخیره شد.");
    } finally {
      setSaving(false);
    }
  };

  const maxYear = currentJalaliMonth().year + 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">تقویم و فیلترها</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-xs space-y-2">
          <Label htmlFor="minJalaliYear">حداقل سال شمسی (شروع از)</Label>
          <Input
            id="minJalaliYear"
            type="number"
            min={1300}
            max={maxYear}
            value={minJalaliYear}
            onChange={(e) => setMinJalaliYear(e.target.value)}
            dir="ltr"
            className="tabular-nums"
          />
          <p className="text-sm text-slate-500 dark:text-gh-fg-muted">
            فیلتر سال داشبورد و انتخاب تاریخ در فرم‌ها نمی‌تواند قبل از این سال باشد.
            محدوده مجاز: ۱۳۰۰ تا {maxYear}.
          </p>
        </div>

        {settings && (
          <p className="text-xs text-slate-400 dark:text-gh-fg-muted">
            آخرین بروزرسانی: {new Date(settings.updatedAt).toLocaleString("fa-IR")}
          </p>
        )}

        <Button onClick={save} disabled={saving || !minJalaliYear.trim()}>
          {saving ? "در حال ذخیره…" : "ذخیره"}
        </Button>
      </CardContent>
    </Card>
  );
}
