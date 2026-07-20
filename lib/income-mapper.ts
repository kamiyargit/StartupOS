import { IncomeRecord, IncomeSource, IncomeCategory, Invoice, InvoiceLineItem } from "@prisma/client";
import { gregorianToJalali, toGregorianString } from "@/lib/dates";

export function mapIncomeRecord(
  r: IncomeRecord & { source: IncomeSource | null; category: IncomeCategory | null },
) {
  return {
    id: r.id,
    sourceId: r.sourceId,
    sourceName: r.source?.name ?? null,
    categoryId: r.categoryId,
    categoryName: r.category?.name ?? null,
    amount: r.amount.toString(),
    currency: r.currency,
    description: r.description,
    incomeDate: toGregorianString(r.incomeDate),
    incomeDateJalali: gregorianToJalali(toGregorianString(r.incomeDate)),
    paymentStatus: r.paymentStatus,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export function mapInvoice(
  inv: Invoice & {
    source: IncomeSource | null;
    lineItems: InvoiceLineItem[];
  },
) {
  return {
    id: inv.id,
    number: inv.number,
    sourceId: inv.sourceId,
    sourceName: inv.source?.name ?? null,
    status: inv.status,
    issueDate: toGregorianString(inv.issueDate),
    issueDateJalali: gregorianToJalali(toGregorianString(inv.issueDate)),
    dueDate: toGregorianString(inv.dueDate),
    dueDateJalali: gregorianToJalali(toGregorianString(inv.dueDate)),
    currency: inv.currency,
    subtotal: inv.subtotal.toString(),
    notes: inv.notes,
    incomeId: inv.incomeId,
    lineItems: inv.lineItems.map((li) => ({
      id: li.id,
      description: li.description,
      quantity: li.quantity.toString(),
      unitPrice: li.unitPrice.toString(),
      total: (BigInt(li.quantity.toString().split(".")[0] || "1") * BigInt(li.unitPrice.toString())).toString(),
    })),
    createdAt: inv.createdAt.toISOString(),
    updatedAt: inv.updatedAt.toISOString(),
  };
}

export async function nextInvoiceNumber(prisma: { invoice: { findFirst: Function } }) {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const last = await prisma.invoice.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
  });
  const seq = last ? Number(last.number.split("-").pop()) + 1 : 1;
  return `${prefix}${String(seq).padStart(3, "0")}`;
}
