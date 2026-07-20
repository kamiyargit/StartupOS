"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AppSettingsDTO } from "@/lib/dto";
import { isSuperAdminRole } from "@/lib/deployment-client";

type SetupData = {
  qrDataUrl: string;
  manualKey: string;
  setupToken: string;
};

export default function SecuritySettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const setupRequired = searchParams.get("required") === "1";
  const isSuperAdmin = isSuperAdminRole(session?.user?.role ?? "");
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [setupCode, setSetupCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [policyMandatory, setPolicyMandatory] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devSms, setDevSms] = useState<{ phone: string; code: string }[]>([]);

  const loadStatus = async () => {
    setLoading(true);
    const [statusRes, settingsRes] = await Promise.all([
      fetch("/api/auth/2fa/status"),
      fetch("/api/settings"),
    ]);
    const statusData = await statusRes.json();
    const settingsData: AppSettingsDTO = await settingsRes.json();
    setEnabled(Boolean(statusData.enabled));
    setPolicyMandatory(settingsData.twoFactorPolicy === "MANDATORY");
    setLoading(false);
  };

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (!loading && setupRequired && !enabled && !setup) {
      void startSetup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, setupRequired, enabled]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !isSuperAdmin) return;
    const id = setInterval(() => {
      fetch("/api/dev/sms/latest")
        .then((r) => r.json())
        .then((d) => setDevSms(d.messages ?? []))
        .catch(() => {});
    }, 3000);
    return () => clearInterval(id);
  }, [isSuperAdmin]);

  const sendSuperAdminOtp = async () => {
    setBusy(true);
    const res = await fetch("/api/auth/super-admin/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send_otp" }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast.error(data.error ?? "ارسال OTP ناموفق بود");
      return;
    }
    setOtpSent(true);
    toast.success("کد OTP ارسال شد.");
  };

  const changeSuperAdminPassword = async () => {
    if (newPassword.length < 8) {
      toast.error("رمز عبور جدید باید حداقل ۸ کاراکتر باشد.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("تکرار رمز عبور با رمز جدید یکسان نیست.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/auth/super-admin/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "change_password", otp: otpCode, newPassword }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast.error(data.error ?? "تغییر رمز عبور ناموفق بود");
      return;
    }
    toast.success("رمز عبور مدیر ارشد به‌روزرسانی شد.");
    setNewPassword("");
    setConfirmPassword("");
    setOtpCode("");
    setOtpSent(false);
  };

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
    if (setupRequired) {
      router.push("/dashboard");
      router.refresh();
    }
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
      {(setupRequired || policyMandatory) && !enabled && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-[#3d2e00] dark:bg-[#3d2e00] dark:text-[#d29922]">
          {setupRequired
            ? "برای استفاده از برنامه باید احراز هویت دو مرحله‌ای را همین الان راه‌اندازی کنید."
            : "احراز هویت دو مرحله‌ای توسط مدیر الزامی شده است."}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">احراز هویت دو مرحله‌ای (TOTP)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-gh-fg-muted">
            وضعیت فعلی:{" "}
            <span className={enabled ? "text-primary-700 dark:text-primary-400" : "text-slate-700 dark:text-gh-fg"}>
              {enabled ? "فعال" : "غیرفعال"}
            </span>
          </p>

          {policyMandatory && enabled && (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-gh-border dark:bg-gh-canvas-inset dark:text-gh-fg-muted">
              احراز هویت دو مرحله‌ای توسط مدیر الزامی شده و قابل غیرفعال‌سازی نیست.
            </p>
          )}

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
                {!setupRequired && (
                  <Button variant="ghost" onClick={() => setSetup(null)} disabled={busy}>
                    انصراف
                  </Button>
                )}
              </div>
            </div>
          )}

          {enabled && !policyMandatory && (
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

      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">تغییر رمز عبور مدیر ارشد (OTP پیامکی)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-gh-fg-muted">
              برای تغییر رمز عبور، ابتدا کد OTP به شماره ثبت‌شده ارسال می‌شود.
            </p>
            {!otpSent ? (
              <Button onClick={sendSuperAdminOtp} disabled={busy}>
                {busy ? "در حال ارسال..." : "ارسال کد OTP"}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="otp-code">کد OTP</Label>
                  <Input
                    id="otp-code"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    dir="ltr"
                    className="text-center tracking-[0.4em]"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-password">رمز عبور جدید</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="confirm-password">تکرار رمز عبور</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <Button
                  onClick={changeSuperAdminPassword}
                  disabled={busy || otpCode.length !== 6 || newPassword.length < 8}
                >
                  {busy ? "در حال ذخیره..." : "تغییر رمز عبور"}
                </Button>
              </div>
            )}
            {devSms.length > 0 && process.env.NODE_ENV !== "production" && (
              <div className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-600" dir="ltr">
                <p className="mb-1 font-medium">Dev OTP</p>
                {devSms.slice(0, 2).map((m, i) => (
                  <p key={i}>{m.phone}: {m.code}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
