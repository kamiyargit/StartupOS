import { requireSession, requireAdmin, jsonError } from "@/lib/auth-helpers";
import { validateDateAgainstAppSettings } from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";
import { mapMeetingMinutes } from "@/lib/meeting-minutes-mapper";

const include = {
  createdBy: true,
  attachments: { where: { deletedAt: null } },
} as const;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const { id } = await params;

    const item = await prisma.meetingMinutes.findFirst({
      where: { id, deletedAt: null },
      include,
    });

    if (!item) throw new Error("NOT_FOUND");
    return Response.json(mapMeetingMinutes(item));
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.meetingMinutes.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new Error("NOT_FOUND");

    if (body.meetingDate) {
      const dateValidation = await validateDateAgainstAppSettings(new Date(body.meetingDate));
      if (!dateValidation.ok) {
        return Response.json({ error: dateValidation.message }, { status: 400 });
      }
    }

    const item = await prisma.$transaction(async (tx) => {
      await tx.meetingMinutes.update({
        where: { id },
        data: {
          meetingDate: body.meetingDate ? new Date(body.meetingDate) : undefined,
          subject: body.subject?.trim(),
          attendees: body.attendees?.trim(),
          summary: body.summary !== undefined ? body.summary?.trim() || null : undefined,
          decisions: body.decisions !== undefined ? body.decisions?.trim() || null : undefined,
          status: body.status,
        },
      });

      if (body.attachmentId) {
        await tx.expenseAttachment.updateMany({
          where: { meetingMinutesId: id },
          data: { meetingMinutesId: null },
        });

        const linked = await tx.expenseAttachment.updateMany({
          where: {
            id: body.attachmentId,
            uploadedByUserId: session.user.id,
            expenseId: null,
            meetingMinutesId: null,
          },
          data: { meetingMinutesId: id },
        });

        if (linked.count === 0) {
          throw new Error("ATTACHMENT_NOT_FOUND");
        }
      }

      return tx.meetingMinutes.findUniqueOrThrow({
        where: { id },
        include,
      });
    });

    return Response.json(mapMeetingMinutes(item));
  } catch (error) {
    if (error instanceof Error && error.message === "ATTACHMENT_NOT_FOUND") {
      return Response.json({ error: "فایل پیوست یافت نشد." }, { status: 400 });
    }
    return jsonError(error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await prisma.meetingMinutes.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new Error("NOT_FOUND");

    await prisma.meetingMinutes.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
