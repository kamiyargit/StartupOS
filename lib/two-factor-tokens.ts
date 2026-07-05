import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";

const PENDING_TTL_SEC = 5 * 60;
const TICKET_TTL_SEC = 60;
const SETUP_TTL_SEC = 10 * 60;

type TokenPurpose = "2fa-pending" | "2fa-ticket" | "2fa-setup";

type SignedPayload = {
  purpose: TokenPurpose;
  sub: string;
  secret?: string;
  exp: number;
};

function authSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters");
  }
  return secret;
}

function encryptionKey() {
  return scryptSync(authSecret(), "cuty-2fa-salt", 32);
}

export function encryptSecret(plain: string) {
  const key = encryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptSecret(encoded: string) {
  const buf = Buffer.from(encoded, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const key = encryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

function signToken(payload: Omit<SignedPayload, "exp">, ttlSec: number) {
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      exp: Math.floor(Date.now() / 1000) + ttlSec,
    }),
  ).toString("base64url");
  const sig = createHmac("sha256", authSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token: string, purpose: TokenPurpose): SignedPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = createHmac("sha256", authSecret()).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SignedPayload;
  if (payload.purpose !== purpose) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export function createPendingToken(userId: string) {
  return signToken({ purpose: "2fa-pending", sub: userId }, PENDING_TTL_SEC);
}

export function verifyPendingToken(token: string) {
  return verifyToken(token, "2fa-pending");
}

export function createTwoFactorTicket(userId: string) {
  return signToken({ purpose: "2fa-ticket", sub: userId }, TICKET_TTL_SEC);
}

export function verifyTwoFactorTicket(token: string) {
  return verifyToken(token, "2fa-ticket");
}

export function createSetupToken(userId: string, plainSecret: string) {
  return signToken(
    {
      purpose: "2fa-setup",
      sub: userId,
      secret: encryptSecret(plainSecret),
    },
    SETUP_TTL_SEC,
  );
}

export function verifySetupToken(token: string) {
  const payload = verifyToken(token, "2fa-setup");
  if (!payload?.secret) return null;
  return { userId: payload.sub, secret: decryptSecret(payload.secret) };
}
