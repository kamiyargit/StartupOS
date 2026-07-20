import { requireSession, jsonError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { mapTask, taskInclude } from "@/lib/task-mapper";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const { id } = await params;
    const task = await prisma.task.findFirst({
      where: { id, deletedAt: null },
      include: taskInclude,
    });
    if (!task) throw new Error("NOT_FOUND");
    return Response.json(mapTask(task));
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

    const existing = await prisma.task.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new Error("NOT_FOUND");

    const labelIds: string[] | undefined = Array.isArray(body.labelIds) ? body.labelIds : undefined;

    const task = await prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id },
        data: {
          title: body.title?.trim(),
          description: body.description !== undefined ? body.description?.trim() || null : undefined,
          priority: body.priority,
          status: body.status,
          categoryId: body.categoryId !== undefined ? body.categoryId || null : undefined,
          assigneeId: body.assigneeId !== undefined ? body.assigneeId || null : undefined,
          dueDate: body.dueDate !== undefined ? (body.dueDate ? new Date(body.dueDate) : null) : undefined,
          sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
        },
      });

      if (labelIds) {
        await tx.taskLabelOnTask.deleteMany({ where: { taskId: id } });
        if (labelIds.length) {
          await tx.taskLabelOnTask.createMany({
            data: labelIds.map((labelId) => ({ taskId: id, labelId })),
            skipDuplicates: true,
          });
        }
      }

      return tx.task.findUniqueOrThrow({ where: { id }, include: taskInclude });
    });

    return Response.json(mapTask(task));
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
    const existing = await prisma.task.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new Error("NOT_FOUND");

    await prisma.task.update({ where: { id }, data: { deletedAt: new Date() } });
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
