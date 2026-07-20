import { Suspense } from "react";
import CompleteSetupPage from "./complete-setup-client";

export default function CompleteSetupRoute() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">...</div>}>
      <CompleteSetupPage />
    </Suspense>
  );
}
