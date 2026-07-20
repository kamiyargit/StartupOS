import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";

export {
  createPendingToken,
  createSetupToken,
  createTwoFactorTicket,
  decryptSecret,
  encryptSecret,
  verifyPendingToken,
  verifySetupToken,
  verifyTwoFactorTicket,
} from "@/lib/two-factor-tokens";

const APP_NAME = "Kartin";

export function createTotpSecret() {
  return generateSecret();
}

export function buildOtpAuthUri(label: string, secret: string, issuer = APP_NAME) {
  return generateURI({
    issuer,
    label,
    secret,
  });
}

export async function createQrDataUrl(uri: string) {
  return QRCode.toDataURL(uri, { margin: 1, width: 220 });
}

export async function verifyTotpCode(secret: string, token: string) {
  const normalized = token.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  const result = await verify({ secret, token: normalized });
  return result.valid;
}
