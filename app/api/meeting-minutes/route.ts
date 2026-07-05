import { Prisma } from "@prisma/client";
import { requireSession, requireAdmin, jsonError } from "@/lib/auth-helpers";
import { validateDateAgainstAppSettings } from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";
import { mapMeetingMinutes } from "@/lib/meeting-minutes-mapper";

const include = {
  createdBy: true,
  attachments: true,
} as const;

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";

    const where: Prisma.MeetingMinutesWhereInput = {};

    if (q) {
      where.OR = [
        { subject: { contains: q, mode: "insensitive" } },
        { attendees: { contains: q, mode: "insensitive" } },
        { summary: { contains: q, mode: "insensitive" } },
        { decisions: { contains: q, mode: "insensitive" } },
      ];
    }

    const items = await prisma.meetingMinutes.findMany({
      where,
      include,
      orderBy: { meetingDate: "desc" },
    });

    return Response.json(items.map(mapMeetingMinutes));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAdmin();
    const body = await req.json();

    if (!body.subject?.trim()) {
      return Response.json({ error: "موضوع جلسه الزامی است." }, { status: 400 });
    }
    if (!body.attendees?.trim()) {
      return Response.json({ error: "افراد حاضر الزامی است." }, { status: 400 });
    }
    if (!body.meetingDate) {
      return Response.json({ error: "تاریخ جلسه الزامی است." }, { status: 400 });
    }
    if (!body.attachmentId) {
      return Response.json({ error: "فایل صورتجلسه الزامی است." }, { status: 400 });
    }

    const meetingDate = new Date(body.meetingDate);
    const dateValidation = await validateDateAgainstAppSettings(meetingDate);
    if (!dateValidation.ok) {
      return Response.json({ error: dateValidation.message }, { status: 400 });
    }

    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.meetingMinutes.create({
        data: {
          meetingDate,
          subject: body.subject.trim(),
          attendees: body.attendees.trim(),
          summary: body.summary?.trim() || null,
          decisions: body.decisions?.trim() || null,
          status: body.status ?? "DRAFT",
          createdByUserId: session.user.id,
        },
      });

      const linked = await tx.expenseAttachment.updateMany({
        where: {
          id: body.attachmentId,
          uploadedByUserId: session.user.id,
          expenseId: null,
          meetingMinutesId: null,
        },
        data: { meetingMinutesId: created.id },
      });

      if (linked.count === 0) {
        throw new Error("ATTACHMENT_NOT_FOUND");
      }

      return tx.meetingMinutes.findUniqueOrThrow({
        where: { id: created.id },
        include,
      });
    });

    return Response.json(mapMeetingMinutes(item), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "ATTACHMENT_NOT_FOUND") {
      return Response.json({ error: "فایل پیوست یافت نشد." }, { status: 400 });
    }
    return jsonError(error);
  }
}
