import { readFile } from "fs/promises";
import { requireSession, jsonError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { resolveStoragePath } from "@/lib/upload";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const { id } = await params;

    const attachment = await prisma.expenseAttachment.findUnique({ where: { id } });
    if (!attachment) throw new Error("NOT_FOUND");

    const filePath = resolveStoragePath(attachment.storagePath);
    const buffer = await readFile(filePath);

    return new Response(buffer, {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.fileName)}"`,
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
