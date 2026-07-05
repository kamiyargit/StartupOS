import { requireSession, requireAdmin, jsonError } from "@/lib/auth-helpers";
import { getAppSettings, updateAppSettings } from "@/lib/app-settings";

export async function GET() {
  try {
    await requireSession();
    return Response.json(await getAppSettings());
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    return Response.json(await updateAppSettings(body));
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_MIN_JALALI_YEAR") {
      return Response.json({ error: "حداقل سال شمسی نامعتبر است." }, { status: 400 });
    }
    return jsonError(error);
  }
}
