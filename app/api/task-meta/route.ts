import { requireSession, jsonError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireSession();
    const [labels, categories] = await Promise.all([
      prisma.taskLabel.findMany({ orderBy: { name: "asc" } }),
      prisma.taskCategory.findMany({ orderBy: { name: "asc" } }),
    ]);
    return Response.json({ labels, categories });
  } catch (error) {
    return jsonError(error);
  }
}
