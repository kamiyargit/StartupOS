import { createHash, randomInt, timingSafeEqual } from "crypto";
import { OtpPurpose } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSmsProvider } from "@/lib/sms";

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").replace(/^98/, "0");
}

export function generateOtpCode(): string {
  return String(randomInt(100000, 999999));
}

export async function sendOtp(phone: string, purpose: OtpPurpose): Promise<void> {
  const normalized = normalizePhone(phone);
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.otpChallenge.create({
    data: {
      phone: normalized,
      purpose,
      codeHash: hashCode(code),
      expiresAt,
    },
  });

  await getSmsProvider().sendOtp(normalized, code);
}

export async function verifyOtp(phone: string, purpose: OtpPurpose, code: string): Promise<boolean> {
  const normalized = normalizePhone(phone);
  const challenge = await prisma.otpChallenge.findFirst({
    where: {
      phone: normalized,
      purpose,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge || challenge.attempts >= MAX_ATTEMPTS) return false;

  const valid =
    challenge.codeHash.length === hashCode(code).length &&
    timingSafeEqual(Buffer.from(challenge.codeHash), Buffer.from(hashCode(code)));

  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: {
      attempts: challenge.attempts + 1,
      usedAt: valid ? new Date() : undefined,
    },
  });

  return valid;
}
