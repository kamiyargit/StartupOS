export type SmsSendResult = { ok: true } | { ok: false; error: string };

export interface SmsProvider {
  sendOtp(phone: string, code: string): Promise<SmsSendResult>;
  sendMessage(phone: string, message: string): Promise<SmsSendResult>;
}
