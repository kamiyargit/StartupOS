import { PrismaClient } from "@/generated/control-client";

const globalForControl = globalThis as unknown as { controlPrisma: PrismaClient };

export const controlPrisma =
  globalForControl.controlPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForControl.controlPrisma = controlPrisma;

export function isControlDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL_CONTROL);
}
