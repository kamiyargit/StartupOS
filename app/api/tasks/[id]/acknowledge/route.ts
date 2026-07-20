import { requireSession, jsonError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { mapTask, taskInclude } from "@/lib/task-mapper";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await req.json();

    const ack = await prisma.taskAcknowledgement.findFirst({
      where: { taskId: id, userId: session.user.id },
    });
    if (!ack) {
      return Response.json({ error: "شما در لیست تأییدکنندگان این وظیفه نیستید." }, { status: 403 });
    }

    await prisma.taskAcknowledgement.update({
      where: { id: ack.id },
      data: {
        acknowledgedAt: new Date(),
        note: typeof body.note === "string" ? body.note.trim() || null : null,
      },
    });

    const task = await prisma.task.findUniqueOrThrow({
      where: { id },
      include: taskInclude,
    });

    return Response.json(mapTask(task));
  } catch (error) {
    return jsonError(error);
  }
}
