"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppSettingsDTO } from "@/lib/dto";
import { currentJalaliMonth } from "@/lib/dates";
import { useAppSettings } from "@/components/app-settings-provider";
import { useSession } from "next-auth/react";
import { isAdminRole } from "@/lib/deployment-client";

export default function AppSettingsPanel() {
  const { data: session } = useSession();
  const isAdmin = isAdminRole(session?.user?.role ?? "");
  const { refresh } = useAppSettings();
  const [settings, setSettings] = useState<AppSettingsDTO | null>(null);
  const [minJalaliYear, setMinJalaliYear] = useState("");
  const [twoFactorPolicy, setTwoFactorPolicy] = useState<"OPTIONAL" | "MANDATORY">("OPTIONAL");
  const [appName, setAppName] = useState("");
  const [appNameShort, setAppNameShort] = useState("");
  const [appNameFa, setAppNameFa] = useState("");
  const [tagline, setTagline] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [themeColor, setThemeColor] = useState("#534AB7");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: AppSettingsDTO) => {
        setSettings(data);
        setMinJalaliYear(String(data.minJalaliYear));
        setTwoFactorPolicy(data.twoFactorPolicy);
        setAppName(data.appName);
        setAppNameShort(data.appNameShort);
        setAppNameFa(data.appNameFa);
        setTagline(data.tagline ?? "");
        setLogoUrl(data.logoUrl ?? "");
        setIconUrl(data.iconUrl ?? "");
        setThemeColor(data.themeColor);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minJalaliYear: Number(minJalaliYear),
          twoFactorPolicy,
          appName,
          appNameShort,
          appNameFa,
          tagline: tagline || null,
          logoUrl: logoUrl || null,
          iconUrl: iconUrl || null,
          themeColor,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "خطا در ذخیره تنظیمات");
        return;
      }
      setSettings(data);
      await refresh();
      toast.success("تنظیمات ذخیره شد.");
    } finally {
      setSaving(false);
    }
  };

  const maxYear = currentJalaliMonth().year + 1;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">برندینگ و نام برنامه</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="appNameFa">نام فارسی</Label>
            <Input id="appNameFa" value={appNameFa} onChange={(e) => setAppNameFa(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="appName">نام انگلیسی</Label>
            <Input id="appName" value={appName} onChange={(e) => setAppName(e.target.value)} dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="appNameShort">نام کوتاه (PWA)</Label>
            <Input id="appNameShort" value={appNameShort} onChange={(e) => setAppNameShort(e.target.value)} dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tagline">توضیح کوتاه</Label>
            <Input id="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logoUrl">آدرس لوگو</Label>
            <Input id="logoUrl" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} dir="ltr" placeholder="/logo.svg" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="iconUrl">آدرس آیکون</Label>
            <Input id="iconUrl" value={iconUrl} onChange={(e) => setIconUrl(e.target.value)} dir="ltr" placeholder="/icons/icon-512.png" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="themeColor">رنگ تم</Label>
            <Input id="themeColor" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} dir="ltr" />
          </div>
        </CardContent>
      </Card>

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
              محدوده مجاز: ۱۳۰۰ تا {maxYear}.
            </p>
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">امنیت</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>احراز هویت دو مرحله‌ای الزامی</Label>
                <p className="text-sm text-slate-500 dark:text-gh-fg-muted">
                  در حالت الزامی، کاربران پس از ورود باید ۲FA را فعال کنند و نمی‌توانند آن را غیرفعال کنند.
                </p>
              </div>
              <Switch
                checked={twoFactorPolicy === "MANDATORY"}
                onCheckedChange={(v) => setTwoFactorPolicy(v ? "MANDATORY" : "OPTIONAL")}
              />
            </div>
            <div className="max-w-xs space-y-2">
              <Label>سیاست فعلی</Label>
              <Select value={twoFactorPolicy} onValueChange={(v) => setTwoFactorPolicy(v as "OPTIONAL" | "MANDATORY")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPTIONAL">اختیاری</SelectItem>
                  <SelectItem value="MANDATORY">الزامی</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {settings && (
        <p className="text-xs text-slate-400 dark:text-gh-fg-muted">
          آخرین بروزرسانی: {new Date(settings.updatedAt).toLocaleString("fa-IR")}
        </p>
      )}

      <Button onClick={save} disabled={saving || !minJalaliYear.trim()}>
        {saving ? "در حال ذخیره…" : "ذخیره تنظیمات"}
      </Button>
    </div>
  );
}
