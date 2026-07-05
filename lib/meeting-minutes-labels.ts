import { MeetingMinutesStatus } from "@prisma/client";

const STATUS_LABELS: Record<MeetingMinutesStatus, string> = {
  DRAFT: "پیش‌نویس",
  APPROVED: "تأییدشده",
};

export function meetingMinutesStatusLabel(status: MeetingMinutesStatus): string {
  return STATUS_LABELS[status];
}
