import { requireSession, requireAdmin, jsonError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { CostFactorTypeDTO } from "@/lib/dto";
import { pickDefaultColor } from "@/lib/cost-type-colors";

function mapType(t: {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  createdAt: Date;
  _count: { expenses: number };
}): CostFactorTypeDTO {
  return {
    id: t.id,
    name: t.name,
    color: t.color ?? "#534AB7",
    isActive: t.isActive,
    createdAt: t.createdAt.toISOString(),
    expenseCount: t._count.expenses,
  };
}

export async function GET() {
  try {
    await requireSession();
    const types = await prisma.costFactorType.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { expenses: true } } },
    });
    return Response.json(types.map(mapType));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const count = await prisma.costFactorType.count();
    const type = await prisma.costFactorType.create({
      data: {
        name: body.name,
        color: body.color ?? pickDefaultColor(count),
      },
      include: { _count: { select: { expenses: true } } },
    });
    return Response.json(mapType(type), { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
