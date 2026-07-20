import type { SmsProvider, SmsSendResult } from "@/lib/sms/types";

type DevSmsEntry = { phone: string; code: string; message: string; at: string };

const globalStore = globalThis as unknown as { __devSmsLatest?: DevSmsEntry[] };

function pushDevSms(entry: DevSmsEntry) {
  const list = globalStore.__devSmsLatest ?? [];
  list.unshift(entry);
  globalStore.__devSmsLatest = list.slice(0, 20);
  console.info(`[DevSMS] to=${entry.phone} code=${entry.code} message=${entry.message}`);
}

export function getDevSmsLatest(): DevSmsEntry[] {
  return globalStore.__devSmsLatest ?? [];
}

export class DevSmsProvider implements SmsProvider {
  async sendOtp(phone: string, code: string): Promise<SmsSendResult> {
    pushDevSms({
      phone,
      code,
      message: `کد تأیید کارتین: ${code}`,
      at: new Date().toISOString(),
    });
    return { ok: true };
  }

  async sendMessage(phone: string, message: string): Promise<SmsSendResult> {
    pushDevSms({ phone, code: "", message, at: new Date().toISOString() });
    return { ok: true };
  }
}
