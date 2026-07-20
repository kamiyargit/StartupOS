import { jsonError } from "@/lib/auth-helpers";
import { isControlDbConfigured } from "@/lib/prisma-control";

export function ensureControlPlaneDb() {
  if (!isControlDbConfigured()) {
    throw new Error("CONTROL_DB_NOT_CONFIGURED");
  }
}

export function setupJsonError(error: unknown, status = 500) {
  if (error instanceof Error) {
    if (error.message === "SETUP_SESSION_REQUIRED") {
      return Response.json({ error: "نشست راه‌اندازی یافت نشد. از ابتدا شروع کنید." }, { status: 401 });
    }
    if (error.message === "CONTROL_DB_NOT_CONFIGURED") {
      return Response.json({ error: "پایگاه داده کنترل پیکربندی نشده است." }, { status: 503 });
    }
  }
  return jsonError(error, status);
}
