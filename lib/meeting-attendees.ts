export type MeetingGuest = {
  name: string;
  description?: string | null;
};

export type MeetingAttendeesData = {
  userIds: string[];
  guests: MeetingGuest[];
};

const ATTENDEES_VERSION = 2;

type StoredAttendees = {
  v: number;
  userIds: string[];
  guests: (string | MeetingGuest)[];
};

export function emptyAttendees(): MeetingAttendeesData {
  return { userIds: [], guests: [] };
}

function normalizeGuest(raw: string | MeetingGuest): MeetingGuest | null {
  if (typeof raw === "string") {
    const name = raw.trim();
    return name ? { name, description: null } : null;
  }
  if (raw && typeof raw.name === "string") {
    const name = raw.name.trim();
    if (!name) return null;
    const description = typeof raw.description === "string" ? raw.description.trim() || null : null;
    return { name, description };
  }
  return null;
}

export function serializeMeetingAttendees(data: MeetingAttendeesData): string {
  const payload: StoredAttendees = {
    v: ATTENDEES_VERSION,
    userIds: data.userIds,
    guests: data.guests.map((g) => ({
      name: g.name.trim(),
      description: g.description?.trim() || null,
    })),
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
          .map(normalizeGuest)
          .filter((g): g is MeetingGuest => g !== null),
      };
    }
  } catch {
    /* legacy plain text */
  }

  const guests = trimmed
    .split(/[،,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => ({ name, description: null }));

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
    if (!guests.some((g) => g.name === name)) guests.push({ name, description: null });
  }
  return { ...data, guests };
}

export function addGuest(
  data: MeetingAttendeesData,
  guest: MeetingGuest,
): MeetingAttendeesData {
  const name = guest.name.trim();
  if (!name) return data;
  if (data.guests.some((g) => g.name === name)) return data;
  return {
    ...data,
    guests: [...data.guests, { name, description: guest.description?.trim() || null }],
  };
}

export function formatMeetingAttendees(
  raw: string,
  users: { id: string; fullName: string; position?: string | null }[],
): string {
  const { systemUsers, guests } = resolveAttendeesDisplay(raw, users);
  const guestParts = guests.map((g) =>
    g.description ? `${g.name} (مهمان — ${g.description})` : `${g.name} (مهمان)`,
  );
  const parts = [...systemUsers, ...guestParts];
  return parts.length > 0 ? parts.join("، ") : "—";
}

export function resolveAttendeesDisplay(
  raw: string,
  users: { id: string; fullName: string; position?: string | null }[],
): { systemUsers: string[]; guests: MeetingGuest[] } {
  const data = parseMeetingAttendees(raw);
  const userMap = new Map(users.map((u) => [u.id, u]));

  return {
    systemUsers: data.userIds.map((id) => {
      const user = userMap.get(id);
      if (!user) return "کاربر حذف‌شده";
      return user.position ? `${user.fullName} (${user.position})` : user.fullName;
    }),
    guests: data.guests,
  };
}
