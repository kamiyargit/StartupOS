import { DevSmsProvider } from "@/lib/sms/dev-provider";
import { KavenegarProvider } from "@/lib/sms/kavenegar-provider";
import type { SmsProvider } from "@/lib/sms/types";

export function getSmsProvider(): SmsProvider {
  const provider = process.env.SMS_PROVIDER ?? (process.env.NODE_ENV === "production" ? "kavenegar" : "dev");

  if (provider === "kavenegar") {
    const apiKey = process.env.KAVENEGAR_API_KEY;
    if (!apiKey) {
      console.warn("[SMS] KAVENEGAR_API_KEY missing — falling back to dev provider");
      return new DevSmsProvider();
    }
    return new KavenegarProvider(apiKey, process.env.KAVENEGAR_TEMPLATE);
  }

  return new DevSmsProvider();
}

export { getDevSmsLatest } from "@/lib/sms/dev-provider";
