import { jsonError } from "@/lib/auth-helpers";
import { getDevSmsLatest } from "@/lib/sms";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Not available" }, { status: 404 });
  }
  try {
    return Response.json({ messages: getDevSmsLatest() });
  } catch (error) {
    return jsonError(error);
  }
}
