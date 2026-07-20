"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function CompleteSetupPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("لینک ورود نامعتبر است.");
      return;
    }

    let cancelled = false;

    async function completeLogin() {
      const result = await signIn("credentials", {
        setupLoginToken: token,
        redirect: false,
      });

      if (cancelled) return;

      if (result?.ok) {
        // Stay on tenant host — NEXTAUTH_URL may point at localhost control plane.
        window.location.replace(`${window.location.origin}/dashboard`);
        return;
      }

      setError(
        result?.error === "CredentialsSignin"
          ? "لینک ورود منقضی یا نامعتبر است. لطفاً از صفحه ورود وارد شوید."
          : "ورود خودکار ناموفق بود. لطفاً از صفحه ورود استفاده کنید.",
      );
    }

    void completeLogin().catch(() => {
      if (!cancelled) {
        setError("ورود خودکار ناموفق بود. لطفاً از صفحه ورود استفاده کنید.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-gh-canvas">
      <div className="absolute start-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {error ? "خطا در ورود" : "در حال ورود به کارتین..."}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-center text-sm text-slate-600 dark:text-gh-fg-muted">
          {error ? (
            <>
              <p>{error}</p>
              <Link
                href="/login"
                className="inline-block font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                رفتن به صفحه ورود
              </Link>
            </>
          ) : (
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary-600" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
