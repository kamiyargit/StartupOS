"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type SetupData = {
  qrDataUrl: string;
  manualKey: string;
  setupToken: string;
};

export default function SecuritySettingsPage() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [setupCode, setSetupCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [busy, setBusy] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    const res = await fetch("/api/auth/2fa/status");
    const data = await res.json();
    setEnabled(Boolean(data.enabled));
    setLoading(false);
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const startSetup = async () => {
    setBusy(true);
    const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      toast.error(data.error ?? "خطا در راه‌اندازی احراز هویت دو مرحله‌ای");
      return;
    }

    setSetup(data);
    setSetupCode("");
  };

  const enable2fa = async () => {
    if (!setup) return;
    setBusy(true);
    const res = await fetch("/api/auth/2fa/enable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setupToken: setup.setupToken, code: setupCode }),
    });
    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      toast.error(data.error ?? "فعال‌سازی ناموفق بود");
      return;
    }

    toast.success("احراز هویت دو مرحله‌ای فعال شد.");
    setSetup(null);
    setSetupCode("");
    setEnabled(true);
  };

  const disable2fa = async () => {
    setBusy(true);
    const res = await fetch("/api/auth/2fa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: disablePassword, code: disableCode }),
    });
    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      toast.error(data.error ?? "غیرفعال‌سازی ناموفق بود");
      return;
    }

    toast.success("احراز هویت دو مرحله‌ای غیرفعال شد.");
    setDisablePassword("");
    setDisableCode("");
    setEnabled(false);
  };

  if (loading) {
    return <p className="text-sm text-slate-500 dark:text-gh-fg-muted">در حال بارگذاری...</p>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">احراز هویت دو مرحله‌ای (TOTP)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-gh-fg-muted">
            وضعیت فعلی:{" "}
            <span className={enabled ? "text-emerald-700 dark:text-gh-success" : "text-slate-700 dark:text-gh-fg"}>
              {enabled ? "فعال" : "غیرفعال"}
            </span>
          </p>

          {!enabled && !setup && (
            <Button onClick={startSetup} disabled={busy}>
              {busy ? "در حال آماده‌سازی..." : "فعال‌سازی احراز هویت دو مرحله‌ای"}
            </Button>
          )}

          {!enabled && setup && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-gh-fg-muted">
                QR code را با اپلیکیشن احراز هویت اسکن کنید، سپس کد ۶ رقمی را وارد کنید.
              </p>
              <div className="flex justify-center rounded-lg border border-slate-200 bg-white p-4 dark:border-gh-border dark:bg-gh-canvas-subtle">
                <Image src={setup.qrDataUrl} alt="QR code for 2FA setup" width={220} height={220} unoptimized />
              </div>
              <div className="space-y-1">
                <Label>کلید دستی (در صورت عدم اسکن QR)</Label>
                <Input value={setup.manualKey} readOnly dir="ltr" className="font-mono text-sm" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="setup-code">کد ۶ رقمی</Label>
                <Input
                  id="setup-code"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  dir="ltr"
                  className="text-center tracking-[0.4em]"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={enable2fa} disabled={busy || setupCode.length !== 6}>
                  {busy ? "در حال تأیید..." : "تأیید و فعال‌سازی"}
                </Button>
                <Button variant="ghost" onClick={() => setSetup(null)} disabled={busy}>
                  انصراف
                </Button>
              </div>
            </div>
          )}

          {enabled && (
            <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-gh-border">
              <p className="text-sm text-slate-600 dark:text-gh-fg-muted">
                برای غیرفعال‌سازی، رمز عبور و کد فعلی اپلیکیشن احراز هویت را وارد کنید.
              </p>
              <div className="space-y-1">
                <Label htmlFor="disable-password">رمز عبور</Label>
                <Input
                  id="disable-password"
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="disable-code">کد ۶ رقمی</Label>
                <Input
                  id="disable-code"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  dir="ltr"
                  className="text-center tracking-[0.4em]"
                />
              </div>
              <Button
                variant="destructive"
                onClick={disable2fa}
                disabled={busy || !disablePassword || disableCode.length !== 6}
              >
                {busy ? "در حال غیرفعال‌سازی..." : "غیرفعال‌سازی"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
