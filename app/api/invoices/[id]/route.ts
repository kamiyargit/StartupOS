import { InvoiceStatus, Prisma } from "@prisma/client";
import { requireSession, jsonError } from "@/lib/auth-helpers";
import { validateDateAgainstAppSettings } from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";
import { mapInvoice } from "@/lib/income-mapper";
import { canTransitionInvoiceStatus } from "@/lib/invoice-workflow";

const include = { source: true, lineItems: { orderBy: { sortOrder: "asc" as const } } } as const;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const { id } = await params;
    const invoice = await prisma.invoice.findFirst({
      where: { id, deletedAt: null },
      include,
    });
    if (!invoice) throw new Error("NOT_FOUND");
    return Response.json(mapInvoice(invoice));
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.invoice.findFirst({
      where: { id, deletedAt: null },
      include,
    });
    if (!existing) throw new Error("NOT_FOUND");

    const nextStatus = body.status as InvoiceStatus | undefined;
    if (nextStatus && !canTransitionInvoiceStatus(existing.status, nextStatus)) {
      return Response.json(
        { error: `تغییر وضعیت از «${existing.status}» به «${nextStatus}» مجاز نیست.` },
        { status: 400 },
      );
    }

    if (body.issueDate) {
      const issueDate = new Date(body.issueDate);
      const v = await validateDateAgainstAppSettings(issueDate);
      if (!v.ok) return Response.json({ error: v.message }, { status: 400 });
    }
    if (body.dueDate) {
      const dueDate = new Date(body.dueDate);
      const v = await validateDateAgainstAppSettings(dueDate);
      if (!v.ok) return Response.json({ error: v.message }, { status: 400 });
    }

    const invoice = await prisma.$transaction(async (tx) => {
      const data: Prisma.InvoiceUpdateInput = {};

      if (nextStatus) data.status = nextStatus;
      if (body.notes !== undefined) data.notes = body.notes?.trim() || null;

      if (body.issueDate) {
        data.issueDate = new Date(body.issueDate);
      }
      if (body.dueDate) {
        data.dueDate = new Date(body.dueDate);
      }

      if (nextStatus === "PAID" && !existing.incomeId) {
        const income = await tx.incomeRecord.create({
          data: {
            sourceId: existing.sourceId,
            amount: existing.subtotal,
            currency: existing.currency,
            description: `درآمد فاکتور ${existing.number}`,
            incomeDate: new Date(),
            paymentStatus: "RECEIVED",
          },
        });
        data.income = { connect: { id: income.id } };
      }

      await tx.invoice.update({ where: { id }, data });

      return tx.invoice.findUniqueOrThrow({ where: { id }, include });
    });

    return Response.json(mapInvoice(invoice));
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const { id } = await params;
    const existing = await prisma.invoice.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new Error("NOT_FOUND");

    await prisma.invoice.update({ where: { id }, data: { deletedAt: new Date() } });
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
