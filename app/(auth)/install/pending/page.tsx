import { Suspense } from "react";
import InstallPendingPage from "./install-pending-client";

export default function Page() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">...</div>}>
      <InstallPendingPage />
    </Suspense>
  );
}
