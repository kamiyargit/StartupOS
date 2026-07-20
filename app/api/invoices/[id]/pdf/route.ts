import { requireSession, jsonError } from "@/lib/auth-helpers";
import { getAppSettings } from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";
import { mapInvoice } from "@/lib/income-mapper";
import { formatExpenseMoney } from "@/lib/currency";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const { id } = await params;
    const invoice = await prisma.invoice.findFirst({
      where: { id, deletedAt: null },
      include: { source: true, lineItems: { orderBy: { sortOrder: "asc" } } },
    });
    if (!invoice) throw new Error("NOT_FOUND");

    const settings = await getAppSettings();
    const mapped = mapInvoice(invoice);

    const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>فاکتور ${mapped.number}</title>
  <style>
    body { font-family: Tahoma, sans-serif; padding: 2rem; color: #111; }
    h1 { color: #534AB7; }
    table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: start; }
    th { background: #f8fafc; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1rem 0; }
  </style>
</head>
<body>
  <h1>${settings.appNameFa}</h1>
  <p>فاکتور شماره: <strong>${mapped.number}</strong></p>
  <div class="meta">
    <div>تاریخ صدور: ${mapped.issueDateJalali}</div>
    <div>سررسید: ${mapped.dueDateJalali}</div>
    <div>مشتری: ${mapped.sourceName ?? "—"}</div>
    <div>وضعیت: ${mapped.status}</div>
  </div>
  <table>
    <thead><tr><th>شرح</th><th>تعداد</th><th>قیمت واحد</th><th>جمع</th></tr></thead>
    <tbody>
      ${mapped.lineItems
        .map(
          (li) =>
            `<tr><td>${li.description}</td><td>${li.quantity}</td><td>${formatExpenseMoney(li.unitPrice, mapped.currency)}</td><td>${formatExpenseMoney(li.total, mapped.currency)}</td></tr>`,
        )
        .join("")}
    </tbody>
  </table>
  <p style="margin-top:1.5rem;font-size:1.25rem"><strong>جمع کل: ${formatExpenseMoney(mapped.subtotal, mapped.currency)}</strong></p>
  ${mapped.notes ? `<p>${mapped.notes}</p>` : ""}
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="invoice-${mapped.number}.html"`,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
