import { Prisma } from "@prisma/client";
import { requireSession, jsonError } from "@/lib/auth-helpers";
import { validateDateAgainstAppSettings } from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";
import { mapIncomeRecord } from "@/lib/income-mapper";
import { buildPaginatedResult, parsePaginationParams } from "@/lib/pagination";

const include = { source: true, category: true } as const;

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";
    const { page, pageSize, skip, take } = parsePaginationParams(searchParams);

    const where: Prisma.IncomeRecordWhereInput = { deletedAt: null };
    if (q) {
      where.OR = [
        { description: { contains: q, mode: "insensitive" } },
        { source: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.incomeRecord.findMany({
        where,
        include,
        orderBy: { incomeDate: "desc" },
        skip,
        take,
      }),
      prisma.incomeRecord.count({ where }),
    ]);

    return Response.json(buildPaginatedResult(items.map(mapIncomeRecord), total, page, pageSize));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireSession();
    const body = await req.json();
    const incomeDate = new Date(body.incomeDate);
    const dateValidation = await validateDateAgainstAppSettings(incomeDate);
    if (!dateValidation.ok) {
      return Response.json({ error: dateValidation.message }, { status: 400 });
    }

    const record = await prisma.incomeRecord.create({
      data: {
        sourceId: body.sourceId || null,
        categoryId: body.categoryId || null,
        amount: body.amount,
        currency: body.currency ?? "TOMAN",
        description: body.description?.trim() || null,
        incomeDate,
        paymentStatus: body.paymentStatus ?? "PENDING",
      },
      include,
    });

    return Response.json(mapIncomeRecord(record), { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
