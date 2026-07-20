import { Task, TaskLabel, TaskCategory, User, TaskAcknowledgement } from "@prisma/client";
import { gregorianToJalali, toGregorianString } from "@/lib/dates";

export type TaskDTO = {
  id: string;
  boardId: string;
  categoryId: string | null;
  categoryName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  createdById: string;
  createdByName: string;
  title: string;
  description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: string;
  dueDate: string | null;
  dueDateJalali: string | null;
  sortOrder: number;
  labels: { id: string; name: string; color: string }[];
  acknowledgements: {
    id: string;
    userId: string;
    userName: string;
    acknowledgedAt: string | null;
    note: string | null;
  }[];
  createdAt: string;
  updatedAt: string;
};

export const taskInclude = {
  category: true,
  assignee: true,
  createdBy: true,
  labels: { include: { label: true } },
  acknowledgements: { include: { user: true }, orderBy: { createdAt: "asc" as const } },
};

type TaskWithRelations = Task & {
  category: TaskCategory | null;
  assignee: User | null;
  createdBy: User;
  labels: { label: TaskLabel }[];
  acknowledgements: (TaskAcknowledgement & { user: User })[];
};

export function mapTask(task: TaskWithRelations): TaskDTO {
  return {
    id: task.id,
    boardId: task.boardId,
    categoryId: task.categoryId,
    categoryName: task.category?.name ?? null,
    assigneeId: task.assigneeId,
    assigneeName: task.assignee?.fullName ?? null,
    createdById: task.createdById,
    createdByName: task.createdBy.fullName,
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    dueDate: task.dueDate ? toGregorianString(task.dueDate) : null,
    dueDateJalali: task.dueDate ? gregorianToJalali(toGregorianString(task.dueDate)) : null,
    sortOrder: task.sortOrder,
    labels: task.labels.map((l) => ({
      id: l.label.id,
      name: l.label.name,
      color: l.label.color,
    })),
    acknowledgements: task.acknowledgements.map((a) => ({
      id: a.id,
      userId: a.userId,
      userName: a.user.fullName,
      acknowledgedAt: a.acknowledgedAt?.toISOString() ?? null,
      note: a.note,
    })),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export const DEFAULT_BOARD_COLUMNS = ["todo", "in_progress", "review", "done"] as const;

export async function ensureDefaultBoard(prisma: {
  taskBoard: { findFirst: Function; create: Function };
}) {
  let board = await prisma.taskBoard.findFirst();
  if (!board) {
    board = await prisma.taskBoard.create({
      data: {
        name: "Default Board",
        settings: { columns: [...DEFAULT_BOARD_COLUMNS] },
      },
    });
  }
  return board;
}
