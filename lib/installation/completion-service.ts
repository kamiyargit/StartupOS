import { InstallationStatus, PrismaClient } from "@prisma/client";
import { markCompleted, markFailed } from "@/lib/installation/installation-service";
import {
  runInstallationValidation,
  runInstallationValidationForDatabase,
} from "@/lib/installation/validation-service";

async function markCompletedOnClient(client: PrismaClient, organizationSlug: string) {
  await client.installationState.upsert({
    where: { id: "singleton" },
    update: {
      status: InstallationStatus.COMPLETED,
      organizationSlug,
      completedAt: new Date(),
      failedAt: null,
      failureReason: null,
    },
    create: {
      id: "singleton",
      status: InstallationStatus.COMPLETED,
      deploymentMode: "cloud",
      installerVersion: "1.0.0",
      organizationSlug,
      completedAt: new Date(),
    },
  });
}

export async function completeInstallation(organizationSlug: string, databaseUrl?: string) {
  if (databaseUrl && databaseUrl !== process.env.DATABASE_URL) {
    const validation = await runInstallationValidationForDatabase(databaseUrl, organizationSlug);
    if (!validation.ok) {
      const message = validation.checks.filter((c) => !c.ok).map((c) => c.label).join("، ");
      const client = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
      try {
        await client.installationState.update({
          where: { id: "singleton" },
          data: {
            status: InstallationStatus.FAILED,
            failedAt: new Date(),
            failureReason: `اعتبارسنجی ناموفق: ${message}`,
          },
        });
      } finally {
        await client.$disconnect();
      }
      throw new Error(`VALIDATION_FAILED:${message}`);
    }

    const client = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    try {
      await markCompletedOnClient(client, organizationSlug);
    } finally {
      await client.$disconnect();
    }
    return validation;
  }

  const validation = await runInstallationValidation(organizationSlug);
  if (!validation.ok) {
    const message = validation.checks.filter((c) => !c.ok).map((c) => c.label).join("، ");
    await markFailed(`اعتبارسنجی ناموفق: ${message}`);
    throw new Error(`VALIDATION_FAILED:${message}`);
  }

  await markCompleted(organizationSlug);
  return validation;
}
