import { Prisma } from "@prisma/client";
import { requireSession, jsonError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { ensureDefaultBoard, mapTask, taskInclude } from "@/lib/task-mapper";
import { buildPaginatedResult, parsePaginationParams } from "@/lib/pagination";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") ?? "inbox";
    const status = searchParams.get("status");
    const { page, pageSize, skip, take } = parsePaginationParams(searchParams);

    const board = await ensureDefaultBoard(prisma);
    const where: Prisma.TaskWhereInput = { deletedAt: null, boardId: board.id };

    if (view === "inbox") {
      where.OR = [
        { assigneeId: session.user.id },
        { acknowledgements: { some: { userId: session.user.id } } },
      ];
    }
    if (status) where.status = status;

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: taskInclude,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        skip,
        take,
      }),
      prisma.task.count({ where }),
    ]);

    return Response.json(buildPaginatedResult(tasks.map(mapTask), total, page, pageSize));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    if (!body.title?.trim()) {
      return Response.json({ error: "عنوان وظیفه الزامی است." }, { status: 400 });
    }

    const board = await ensureDefaultBoard(prisma);
    const labelIds: string[] = Array.isArray(body.labelIds) ? body.labelIds : [];
    const ackUserIds: string[] = Array.isArray(body.acknowledgementUserIds)
      ? body.acknowledgementUserIds
      : [];

    const task = await prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          boardId: board.id,
          categoryId: body.categoryId || null,
          assigneeId: body.assigneeId || null,
          createdById: session.user.id,
          title: body.title.trim(),
          description: body.description?.trim() || null,
          priority: body.priority ?? "MEDIUM",
          status: body.status ?? "todo",
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          sortOrder: Number(body.sortOrder ?? 0),
        },
      });

      if (labelIds.length) {
        await tx.taskLabelOnTask.createMany({
          data: labelIds.map((labelId: string) => ({ taskId: created.id, labelId })),
          skipDuplicates: true,
        });
      }

      if (ackUserIds.length) {
        await tx.taskAcknowledgement.createMany({
          data: ackUserIds.map((userId: string) => ({
            taskId: created.id,
            userId,
            requestedById: session.user.id,
          })),
          skipDuplicates: true,
        });
      }

      return tx.task.findUniqueOrThrow({ where: { id: created.id }, include: taskInclude });
    });

    return Response.json(mapTask(task), { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
