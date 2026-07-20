import { InvoiceStatus } from "@prisma/client";

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "پیش‌نویس",
  SENT: "ارسال‌شده",
  PAID: "پرداخت‌شده",
  OVERDUE: "سررسید گذشته",
  CANCELLED: "لغو شده",
};

const ALLOWED_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["PAID", "OVERDUE", "CANCELLED"],
  OVERDUE: ["PAID", "CANCELLED"],
  PAID: [],
  CANCELLED: [],
};

export function canTransitionInvoiceStatus(from: InvoiceStatus, to: InvoiceStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function nextInvoiceActions(status: InvoiceStatus): InvoiceStatus[] {
  return ALLOWED_TRANSITIONS[status];
}
