"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

type Step = "credentials" | "otp";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const otpRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("credentials");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [pendingToken, setPendingToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const callback = searchParams.get("callbackUrl") ?? "/dashboard";

  useEffect(() => {
    if (step === "otp") {
      otpRef.current?.focus();
    }
  }, [step]);

  const finishLogin = async (twoFactorTicket?: string) => {
    const res = await signIn("credentials", {
      login,
      password,
      twoFactorTicket: twoFactorTicket ?? "",
      redirect: false,
    });

    if (res?.error) {
      return false;
    }

    router.push(callback);
    router.refresh();
    return true;
  };

  const onCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/prelogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? "نام کاربری یا رمز عبور اشتباه است.");
        return;
      }

      if (data?.requires2fa) {
        if (!data.pendingToken) {
          setError("خطا در شروع تأیید دو مرحله‌ای. دوباره تلاش کنید.");
          return;
        }
        setPendingToken(data.pendingToken);
        setOtp("");
        setStep("otp");
        return;
      }

      const ok = await finishLogin();
      if (!ok) {
        setError("ورود ناموفق بود. لطفاً دوباره تلاش کنید.");
      }
    } finally {
      setLoading(false);
    }
  };

  const onOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/complete-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password, pendingToken, otp }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "کد احراز هویت نامعتبر است.");
        return;
      }

      const ok = await finishLogin(data.twoFactorTicket);
      if (!ok) {
        setError("ورود ناموفق بود. لطفاً دوباره تلاش کنید.");
      }
    } finally {
      setLoading(false);
    }
  };

  const backToCredentials = () => {
    setStep("credentials");
    setOtp("");
    setPendingToken("");
    setError(null);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-slate-100 p-4 dark:from-gh-canvas dark:via-gh-canvas-subtle dark:to-gh-canvas">
      <div className="absolute start-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md border-0 shadow-xl dark:border dark:border-gh-border dark:shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-emerald-800 dark:text-gh-success">پنل کیوتی</CardTitle>
          <p className="text-sm text-slate-500 dark:text-gh-fg-muted">
            {step === "credentials"
              ? "ورود به سامانه مدیریت سازمانی"
              : "تأیید احراز هویت دو مرحله‌ای"}
          </p>
        </CardHeader>
        <CardContent>
          {step === "credentials" ? (
            <form onSubmit={onCredentialsSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login">ایمیل یا نام کاربری</Label>
                <Input
                  id="login"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">رمز عبور</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              {error && <p className="text-sm text-red-600 dark:text-gh-danger">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "در حال بررسی..." : "ورود"}
              </Button>
            </form>
          ) : (
            <form onSubmit={onOtpSubmit} className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-[#033a16] dark:bg-[#033a16]/40">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-gh-success" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-emerald-800 dark:text-gh-success">رمز عبور تأیید شد</p>
                  <p className="text-slate-600 dark:text-gh-fg-muted">
                    برای ورود به حساب <span className="font-medium">{login}</span>، کد ۶ رقمی
                    اپلیکیشن احراز هویت را وارد کنید.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="otp">کد ۶ رقمی اپلیکیشن احراز هویت</Label>
                <Input
                  ref={otpRef}
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  className="text-center text-lg tracking-[0.4em]"
                  placeholder="000000"
                />
              </div>
              {error && <p className="text-sm text-red-600 dark:text-gh-danger">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                {loading ? "در حال تأیید..." : "تأیید و ورود"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={backToCredentials}>
                بازگشت
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
