export type MeetingAttendeesData = {
  userIds: string[];
  guests: string[];
};

const ATTENDEES_VERSION = 1;

type StoredAttendees = {
  v: number;
  userIds: string[];
  guests: string[];
};

export function emptyAttendees(): MeetingAttendeesData {
  return { userIds: [], guests: [] };
}

export function serializeMeetingAttendees(data: MeetingAttendeesData): string {
  const payload: StoredAttendees = {
    v: ATTENDEES_VERSION,
    userIds: data.userIds,
    guests: data.guests.map((g) => g.trim()).filter(Boolean),
  };
  return JSON.stringify(payload);
}

export function parseMeetingAttendees(raw: string): MeetingAttendeesData {
  const trimmed = raw.trim();
  if (!trimmed) return emptyAttendees();

  try {
    const parsed = JSON.parse(trimmed) as Partial<StoredAttendees>;
    if (parsed && Array.isArray(parsed.userIds) && Array.isArray(parsed.guests)) {
      return {
        userIds: parsed.userIds.filter((id): id is string => typeof id === "string"),
        guests: parsed.guests
          .filter((g): g is string => typeof g === "string")
          .map((g) => g.trim())
          .filter(Boolean),
      };
    }
  } catch {
    /* legacy plain text */
  }

  const guests = trimmed
    .split(/[،,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  return { userIds: [], guests };
}

export function hasMeetingAttendees(data: MeetingAttendeesData): boolean {
  return data.userIds.length > 0 || data.guests.length > 0;
}

export function parseGuestNames(raw: string): string[] {
  return raw
    .split(/[،,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function mergeGuestNames(
  data: MeetingAttendeesData,
  raw: string,
): MeetingAttendeesData {
  const names = parseGuestNames(raw);
  if (!names.length) return data;

  const guests = [...data.guests];
  for (const name of names) {
    if (!guests.includes(name)) guests.push(name);
  }
  return { ...data, guests };
}

export function formatMeetingAttendees(
  raw: string,
  users: { id: string; fullName: string }[],
): string {
  const { systemUsers, guests } = resolveAttendeesDisplay(raw, users);
  const parts = [...systemUsers, ...guests.map((g) => `${g} (مهمان)`)];
  return parts.length > 0 ? parts.join("، ") : "—";
}

export function resolveAttendeesDisplay(
  raw: string,
  users: { id: string; fullName: string }[],
): { systemUsers: string[]; guests: string[] } {
  const data = parseMeetingAttendees(raw);
  const userMap = new Map(users.map((u) => [u.id, u.fullName]));

  return {
    systemUsers: data.userIds.map((id) => userMap.get(id) ?? "کاربر حذف‌شده"),
    guests: data.guests,
  };
}
