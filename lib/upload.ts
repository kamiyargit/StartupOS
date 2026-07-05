import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export function getUploadDir(): string {
  return process.env.UPLOAD_DIR ?? "./uploads";
}

export function getMaxUploadBytes(): number {
  const mb = Number(process.env.MAX_UPLOAD_MB ?? 10);
  return mb * 1024 * 1024;
}

export function isAllowedMime(mime: string): boolean {
  return ALLOWED_MIME.has(mime);
}

export async function saveUploadFile(
  buffer: Buffer,
  originalName: string,
): Promise<{ storagePath: string; fileName: string }> {
  const uploadDir = getUploadDir();
  await mkdir(uploadDir, { recursive: true });

  const ext = path.extname(originalName) || "";
  const fileName = `${randomUUID()}${ext}`;
  const fullPath = path.join(uploadDir, fileName);

  await writeFile(fullPath, buffer);
  return { storagePath: fileName, fileName: originalName };
}

export function resolveStoragePath(storagePath: string): string {
  if (path.isAbsolute(storagePath)) {
    return storagePath;
  }
  const uploadDir = getUploadDir();
  const base = path.isAbsolute(uploadDir) ? uploadDir : path.join(process.cwd(), uploadDir);
  return path.join(base, storagePath);
}
