import type { SmsProvider, SmsSendResult } from "@/lib/sms/types";

export class KavenegarProvider implements SmsProvider {
  private apiKey: string;
  private template: string;

  constructor(apiKey: string, template?: string) {
    this.apiKey = apiKey;
    this.template = template ?? "verify";
  }

  private async call(phone: string, token: string): Promise<SmsSendResult> {
    const url = `https://api.kavenegar.com/v1/${this.apiKey}/verify/lookup.json?receptor=${encodeURIComponent(phone)}&token=${encodeURIComponent(token)}&template=${encodeURIComponent(this.template)}`;
    try {
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) {
        const text = await res.text();
        return { ok: false, error: text || `Kavenegar HTTP ${res.status}` };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "SMS send failed" };
    }
  }

  async sendOtp(phone: string, code: string): Promise<SmsSendResult> {
    return this.call(phone, code);
  }

  async sendMessage(phone: string, message: string): Promise<SmsSendResult> {
    const url = `https://api.kavenegar.com/v1/${this.apiKey}/sms/send.json?receptor=${encodeURIComponent(phone)}&message=${encodeURIComponent(message)}`;
    try {
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) return { ok: false, error: `Kavenegar HTTP ${res.status}` };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "SMS send failed" };
    }
  }
}
