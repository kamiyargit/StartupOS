import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { controlPrisma, isControlDbConfigured } from "@/lib/prisma-control";

const COOKIE_NAME = "kartin_setup_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export async function createSetupSession(organizationId: string): Promise<string> {
  if (!isControlDbConfigured()) throw new Error("CONTROL_DB_NOT_CONFIGURED");

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await controlPrisma.setupSession.create({
    data: { token, organizationId, expiresAt },
  });

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export async function getSetupOrganizationId(): Promise<string | null> {
  if (!isControlDbConfigured()) return null;

  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await controlPrisma.setupSession.findUnique({ where: { token } });
  if (!session || session.expiresAt < new Date()) {
    if (session) await controlPrisma.setupSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session.organizationId;
}

export async function requireSetupOrganizationId(): Promise<string> {
  const id = await getSetupOrganizationId();
  if (!id) throw new Error("SETUP_SESSION_REQUIRED");
  return id;
}

export async function clearSetupSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) {
    await controlPrisma.setupSession.deleteMany({ where: { token } }).catch(() => {});
  }
  jar.delete(COOKIE_NAME);
}
