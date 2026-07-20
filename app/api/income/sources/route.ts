import { requireSession, jsonError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireSession();
    const sources = await prisma.incomeSource.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
    const categories = await prisma.incomeCategory.findMany({ orderBy: { name: "asc" } });
    return Response.json({ sources, categories });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireSession();
    const body = await req.json();
    if (!body.name?.trim()) {
      return Response.json({ error: "نام منبع الزامی است." }, { status: 400 });
    }
    const source = await prisma.incomeSource.create({
      data: {
        name: body.name.trim(),
        type: body.type ?? "OTHER",
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        notes: body.notes?.trim() || null,
      },
    });
    return Response.json(source, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
