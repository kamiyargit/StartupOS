import { Prisma } from "@prisma/client";
import { requireSession, jsonError } from "@/lib/auth-helpers";
import { validateDateAgainstAppSettings } from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";
import { mapInvoice, nextInvoiceNumber } from "@/lib/income-mapper";
import { buildPaginatedResult, parsePaginationParams } from "@/lib/pagination";

const include = { source: true, lineItems: { orderBy: { sortOrder: "asc" as const } } } as const;

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const receivables = searchParams.get("receivables") === "true";
    const { page, pageSize, skip, take } = parsePaginationParams(searchParams);

    const where: Prisma.InvoiceWhereInput = { deletedAt: null };
    if (status) where.status = status as Prisma.EnumInvoiceStatusFilter["equals"];
    if (receivables) {
      where.status = { in: ["SENT", "OVERDUE"] };
    }

    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include,
        orderBy: { issueDate: "desc" },
        skip,
        take,
      }),
      prisma.invoice.count({ where }),
    ]);

    return Response.json(buildPaginatedResult(items.map(mapInvoice), total, page, pageSize));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireSession();
    const body = await req.json();
    const issueDate = new Date(body.issueDate);
    const dueDate = new Date(body.dueDate);
    for (const d of [issueDate, dueDate]) {
      const v = await validateDateAgainstAppSettings(d);
      if (!v.ok) return Response.json({ error: v.message }, { status: 400 });
    }

    const lineItems = Array.isArray(body.lineItems) ? body.lineItems : [];
    if (!lineItems.length) {
      return Response.json({ error: "حداقل یک قلم فاکتور الزامی است." }, { status: 400 });
    }

    const subtotal = lineItems.reduce(
      (sum: bigint, li: { quantity: string; unitPrice: string }) =>
        sum + BigInt(Math.round(Number(li.quantity) * Number(li.unitPrice))),
      BigInt(0),
    );

    const number = body.number?.trim() || (await nextInvoiceNumber(prisma));

    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          number,
          sourceId: body.sourceId || null,
          status: body.status ?? "DRAFT",
          issueDate,
          dueDate,
          currency: body.currency ?? "TOMAN",
          subtotal,
          notes: body.notes?.trim() || null,
        },
      });

      await tx.invoiceLineItem.createMany({
        data: lineItems.map((li: { description: string; quantity: string; unitPrice: string }, i: number) => ({
          invoiceId: created.id,
          description: li.description.trim(),
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          sortOrder: i,
        })),
      });

      return tx.invoice.findUniqueOrThrow({ where: { id: created.id }, include });
    });

    return Response.json(mapInvoice(invoice), { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
