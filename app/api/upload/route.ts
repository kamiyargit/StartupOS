import { requireSession, jsonError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  getMaxUploadBytes,
  isAllowedMime,
  saveUploadFile,
} from "@/lib/upload";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "فایلی انتخاب نشده است." }, { status: 400 });
    }

    if (!isAllowedMime(file.type)) {
      return Response.json({ error: "فرمت فایل مجاز نیست." }, { status: 400 });
    }

    if (file.size > getMaxUploadBytes()) {
      return Response.json({ error: "حجم فایل بیش از حد مجاز است." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { storagePath, fileName } = await saveUploadFile(buffer, file.name);

    const attachment = await prisma.expenseAttachment.create({
      data: {
        uploadedByUserId: session.user.id,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        storagePath,
      },
    });

    return Response.json({
      id: attachment.id,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      url: `/api/files/${attachment.id}`,
    });
  } catch (error) {
    return jsonError(error);
  }
}
