"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DualDatePicker } from "@/components/dual-date-picker";
import { AttendeesPicker, AttendeesPickerHandle } from "@/components/attendees-picker";
import { FileUpload, UploadedFile } from "@/components/file-upload";
import { MeetingMinutesStatus } from "@prisma/client";
import {
  MeetingAttendeesData,
  emptyAttendees,
  hasMeetingAttendees,
  parseMeetingAttendees,
  serializeMeetingAttendees,
} from "@/lib/meeting-attendees";

export type MeetingMinutesFormValues = {
  meetingDate: Date | null;
  subject: string;
  attendees: string;
  summary: string;
  decisions: string;
  status: MeetingMinutesStatus;
  file: UploadedFile | null;
};

type MeetingMinutesFormProps = {
  initial?: Partial<Omit<MeetingMinutesFormValues, "attendees">> & {
    attendees?: string;
  };
  submitLabel: string;
  loadingLabel: string;
  requireFile?: boolean;
  onSubmit: (values: MeetingMinutesFormValues) => Promise<boolean>;
};

export function MeetingMinutesForm({
  initial,
  submitLabel,
  loadingLabel,
  requireFile = true,
  onSubmit,
}: MeetingMinutesFormProps) {
  const [meetingDate, setMeetingDate] = useState<Date | null>(initial?.meetingDate ?? new Date());
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [attendees, setAttendees] = useState<MeetingAttendeesData>(() =>
    initial?.attendees ? parseMeetingAttendees(initial.attendees) : emptyAttendees(),
  );
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [decisions, setDecisions] = useState(initial?.decisions ?? "");
  const [status, setStatus] = useState<MeetingMinutesStatus>(initial?.status ?? "DRAFT");
  const [file, setFile] = useState<UploadedFile | null>(initial?.file ?? null);
  const [loading, setLoading] = useState(false);
  const attendeesRef = useRef<AttendeesPickerHandle>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const attendeesData = attendeesRef.current?.flushPendingGuests() ?? attendees;
    if (attendeesData !== attendees) {
      setAttendees(attendeesData);
    }

    if (!meetingDate) {
      toast.error("تاریخ جلسه الزامی است.");
      return;
    }
    if (!subject.trim()) {
      toast.error("موضوع جلسه الزامی است.");
      return;
    }
    if (!hasMeetingAttendees(attendeesData)) {
      toast.error("حداقل یک فرد حاضر (کاربر یا مهمان) انتخاب کنید.");
      return;
    }
    if (requireFile && !file) {
      toast.error("فایل صورتجلسه الزامی است.");
      return;
    }

    setLoading(true);
    const ok = await onSubmit({
      meetingDate,
      subject,
      attendees: serializeMeetingAttendees(attendeesData),
      summary,
      decisions,
      status,
      file,
    });
    setLoading(false);
    return ok;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label>تاریخ جلسه</Label>
        <DualDatePicker value={meetingDate} onChange={setMeetingDate} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">موضوع جلسه</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="موضوع جلسه هیئت‌مدیره"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="attendees">افراد حاضر</Label>
        <AttendeesPicker ref={attendeesRef} id="attendees" value={attendees} onChange={setAttendees} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="summary">خلاصه جلسه</Label>
        <Textarea
          id="summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="خلاصه مطالب مطرح‌شده"
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="decisions">مصوبات</Label>
        <Textarea
          id="decisions"
          value={decisions}
          onChange={(e) => setDecisions(e.target.value)}
          placeholder="مصوبات جلسه"
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label>وضعیت</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as MeetingMinutesStatus)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DRAFT">پیش‌نویس</SelectItem>
            <SelectItem value="APPROVED">تأییدشده</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>فایل صورتجلسه</Label>
        <FileUpload
          value={file ? [file] : []}
          onChange={(files) => setFile(files[files.length - 1] ?? null)}
        />
        {!requireFile && (
          <p className="text-xs text-slate-500 dark:text-gh-fg-muted">
            در صورت عدم انتخاب فایل جدید، فایل قبلی حفظ می‌شود.
          </p>
        )}
      </div>

      <Button type="submit" disabled={loading} className="w-full sm:w-auto">
        {loading ? loadingLabel : submitLabel}
      </Button>
    </form>
  );
}
