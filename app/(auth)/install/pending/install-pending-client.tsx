"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { setupPortalUrl } from "@/lib/deployment-client";

type InstallStatus = {
  installed: boolean;
  status: string;
  failureReason: string | null;
  organizationSlug: string | null;
};

export default function InstallPendingPage() {
  const searchParams = useSearchParams();
  const hasError = searchParams.get("error") === "1";
  const [status, setStatus] = useState<InstallStatus | null>(null);

  useEffect(() => {
    const poll = () => {
      fetch("/api/installation/status")
        .then((r) => r.json())
        .then((data) => {
          setStatus(data);
          if (data.installed) {
            window.location.href = "/login";
          }
        })
        .catch(() => setStatus(null));
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  const isFailed = hasError || status?.status === "FAILED";

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-gh-canvas">
      <div className="absolute start-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {isFailed ? "خطا در راه‌اندازی" : "در حال آماده‌سازی کارتین"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center text-sm text-slate-600 dark:text-gh-fg-muted">
          {isFailed ? (
            <>
              <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
              <p>{status?.failureReason ?? "راه‌اندازی سازمان با خطا مواجه شد."}</p>
            </>
          ) : (
            <>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary-600" />
              <p>سامانه در حال پیکربندی است. پس از اتمام به صفحه ورود هدایت می‌شوید.</p>
            </>
          )}
          <Button variant="outline" asChild className="w-full">
            <Link href={setupPortalUrl()}>پورتال راه‌اندازی کارتین</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
