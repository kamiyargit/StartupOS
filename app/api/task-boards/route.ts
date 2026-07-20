import { requireSession, requireAdmin, jsonError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { ensureDefaultBoard, DEFAULT_BOARD_COLUMNS } from "@/lib/task-mapper";

const MAX_COLUMNS = 8;
const COLUMN_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

function normalizeColumns(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.length < 2 || input.length > MAX_COLUMNS) return null;
  const columns = input.map((value) => (typeof value === "string" ? value.trim() : ""));
  if (columns.some((value) => !value || !COLUMN_KEY_PATTERN.test(value))) return null;
  if (new Set(columns).size !== columns.length) return null;
  return columns;
}

function boardSettings(settings: unknown) {
  const raw = (settings ?? {}) as { columns?: string[]; columnLabels?: Record<string, string> };
  return {
    columns: raw.columns?.length ? raw.columns : [...DEFAULT_BOARD_COLUMNS],
    columnLabels: raw.columnLabels ?? {},
  };
}

export async function GET() {
  try {
    await requireSession();
    const board = await ensureDefaultBoard(prisma);
    const settings = boardSettings(board.settings);
    return Response.json({
      id: board.id,
      name: board.name,
      columns: settings.columns,
      columnLabels: settings.columnLabels,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const columns = normalizeColumns(body.columns);
    if (!columns) {
      return Response.json(
        { error: "ستون‌ها باید بین ۲ تا ۸ مورد، یکتا و با شناسه انگلیسی (a-z, _) باشند." },
        { status: 400 },
      );
    }

    const columnLabels =
      body.columnLabels && typeof body.columnLabels === "object"
        ? Object.fromEntries(
            Object.entries(body.columnLabels as Record<string, unknown>)
              .filter(([key, value]) => columns.includes(key) && typeof value === "string")
              .map(([key, value]) => [key, (value as string).trim()]),
          )
        : {};

    const board = await ensureDefaultBoard(prisma);
    await prisma.taskBoard.update({
      where: { id: board.id },
      data: {
        name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : board.name,
        settings: { columns, columnLabels },
      },
    });

    return Response.json({ id: board.id, name: board.name, columns, columnLabels });
  } catch (error) {
    return jsonError(error);
  }
}
