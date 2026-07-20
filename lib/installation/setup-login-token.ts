import { createHmac, timingSafeEqual } from "crypto";
import { controlPrisma, isControlDbConfigured } from "@/lib/prisma-control";

const SETUP_LOGIN_TTL_SEC = 15 * 60;

export type SetupLoginPayload = {
  purpose: "setup-login";
  sub: string;
  organizationId: string;
  exp: number;
};

function authSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters");
  }
  return secret;
}

function signPayload(payload: Omit<SetupLoginPayload, "exp">, ttlSec: number) {
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      exp: Math.floor(Date.now() / 1000) + ttlSec,
    }),
  ).toString("base64url");
  const sig = createHmac("sha256", authSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySetupLoginToken(token: string): SetupLoginPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = createHmac("sha256", authSecret()).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SetupLoginPayload;
  if (payload.purpose !== "setup-login") return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export async function createSetupLoginToken(
  tenantUserId: string,
  organizationId: string,
): Promise<string> {
  const token = signPayload(
    { purpose: "setup-login", sub: tenantUserId, organizationId },
    SETUP_LOGIN_TTL_SEC,
  );
  const expiresAt = new Date(Date.now() + SETUP_LOGIN_TTL_SEC * 1000);

  if (isControlDbConfigured()) {
    await controlPrisma.setupLoginToken.create({
      data: {
        token,
        organizationId,
        tenantUserId,
        expiresAt,
      },
    });
  }

  return token;
}

export function setupLoginDashboardUrl(tenantBaseUrl: string, token: string): string {
  const base = tenantBaseUrl.replace(/\/$/, "");
  return `${base}/auth/complete-setup?token=${encodeURIComponent(token)}`;
}
