import { readFile } from "fs/promises";
import { requireSession, jsonError } from "@/lib/auth-helpers";
import { isAdminRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { resolveStoragePath } from "@/lib/upload";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const { id } = await params;

    const attachment = await prisma.expenseAttachment.findFirst({
      where: { id, deletedAt: null },
    });
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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const attachment = await prisma.expenseAttachment.findFirst({
      where: { id, deletedAt: null },
      include: { expense: true },
    });
    if (!attachment) throw new Error("NOT_FOUND");

    const isAdmin = isAdminRole(session.user.role ?? "");
    const isUploader = attachment.uploadedByUserId === session.user.id;
    const isExpenseOwner = attachment.expense?.addedByUserId === session.user.id;

    if (!isAdmin && !isUploader && !isExpenseOwner) {
      throw new Error("FORBIDDEN");
    }

    await prisma.expenseAttachment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
