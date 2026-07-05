import {
  MeetingMinutes,
  ExpenseAttachment,
  User,
} from "@prisma/client";
import { MeetingMinutesDTO } from "@/lib/dto";
import { gregorianToJalali, toGregorianString } from "@/lib/dates";

type MeetingMinutesWithRelations = MeetingMinutes & {
  createdBy: User;
  attachments: ExpenseAttachment[];
};

function mapAttachment(a: ExpenseAttachment) {
  return {
    id: a.id,
    fileName: a.fileName,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    url: `/api/files/${a.id}`,
  };
}

export function mapMeetingMinutes(m: MeetingMinutesWithRelations): MeetingMinutesDTO {
  const meetingDate = toGregorianString(m.meetingDate);
  const document = m.attachments[0] ? mapAttachment(m.attachments[0]) : null;

  return {
    id: m.id,
    meetingDate,
    meetingDateJalali: gregorianToJalali(meetingDate),
    subject: m.subject,
    attendees: m.attendees,
    summary: m.summary,
    decisions: m.decisions,
    status: m.status,
    createdByUserId: m.createdByUserId,
    createdByName: m.createdBy.fullName,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    document,
  };
}
