import { getBaseDomain, tenantUrl } from "@/lib/deployment";
import { completeInstallation } from "@/lib/installation/completion-service";
import { getTenantProvisioner } from "@/lib/installation/provisioning/docker-provisioner";
import { validateSlug } from "@/lib/installation/slug";
import { bootstrapCurrentTenant, bootstrapTenantDatabase, type TenantBootstrapInput } from "@/lib/installation/tenant-bootstrap";
import { controlPrisma } from "@/lib/prisma-control";

export type ProvisionInput = TenantBootstrapInput & {
  organizationId: string;
};

function buildTenantDatabaseUrl(slug: string): string | null {
  const template = process.env.TENANT_DATABASE_URL_TEMPLATE;
  if (template) return template.replace("{slug}", slug);

  if (process.env.NODE_ENV !== "production") {
    return process.env.TENANT_DATABASE_URL ?? process.env.DATABASE_URL ?? null;
  }

  const base = process.env.DATABASE_URL;
  if (!base) return null;
  const url = new URL(base);
  url.pathname = `/kartin_${slug}`;
  return url.toString();
}

export async function checkSlugAvailable(slug: string, organizationId?: string): Promise<boolean> {
  const validated = validateSlug(slug);
  if (!validated.ok) return false;

  const provisioner = getTenantProvisioner();
  if (!(await provisioner.validateSubdomain(validated.slug))) return false;

  const existing = await controlPrisma.subdomainReservation.findUnique({
    where: { slug: validated.slug },
  });
  if (!existing) return true;
  return organizationId ? existing.organizationId === organizationId : false;
}

export async function reserveSlug(organizationId: string, slug: string) {
  const validated = validateSlug(slug);
  if (!validated.ok) throw new Error(validated.error);

  const available = await checkSlugAvailable(validated.slug, organizationId);
  if (!available) throw new Error("این زیردامنه قبلاً رزرو شده است.");

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await controlPrisma.subdomainReservation.deleteMany({
    where: { organizationId, slug: { not: validated.slug } },
  });

  return controlPrisma.subdomainReservation.upsert({
    where: { slug: validated.slug },
    update: { organizationId, status: "RESERVED", expiresAt },
    create: { slug: validated.slug, organizationId, status: "RESERVED", expiresAt },
  });
}

export async function provisionOrganization(
  input: ProvisionInput,
): Promise<{ tenantUrl: string; tenantUserId: string }> {
  const org = await controlPrisma.organization.findUnique({ where: { id: input.organizationId } });
  if (!org) throw new Error("NOT_FOUND");

  const slug = input.organizationSlug;
  const validated = validateSlug(slug);
  if (!validated.ok) throw new Error(validated.error);

  if (org.status === "ACTIVE") {
    throw new Error("این سازمان قبلاً راه‌اندازی شده است.");
  }

  await reserveSlug(input.organizationId, validated.slug);

  const job = await controlPrisma.provisioningJob.create({
    data: {
      organizationId: input.organizationId,
      status: "IN_PROGRESS",
      currentStep: "REVIEW",
      startedAt: new Date(),
    },
  });

  await controlPrisma.organization.update({
    where: { id: input.organizationId },
    data: { status: "PROVISIONING", slug: validated.slug },
  });

  try {
    const provisioner = getTenantProvisioner();
    const stack = await provisioner.createTenantStack({
      slug: validated.slug,
      organizationId: input.organizationId,
    });

    const tenantDbUrl = stack.tenantDatabaseUrl || buildTenantDatabaseUrl(validated.slug);

    let tenantUserId: string;

    if (tenantDbUrl && tenantDbUrl !== process.env.DATABASE_URL) {
      tenantUserId = await bootstrapTenantDatabase(tenantDbUrl, input);
    } else {
      tenantUserId = await bootstrapCurrentTenant(input);
    }

    await completeInstallation(validated.slug, tenantDbUrl ?? undefined);

    const url = tenantUrl(validated.slug);

    await controlPrisma.organization.update({
      where: { id: input.organizationId },
      data: { status: "ACTIVE", tenantUrl: url, slug: validated.slug, setupStep: "REVIEW" },
    });

    await controlPrisma.subdomainReservation.update({
      where: { slug: validated.slug },
      data: { status: "ACTIVE", expiresAt: null },
    });

    await controlPrisma.provisioningJob.update({
      where: { id: job.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    await controlPrisma.superAdminDraft.deleteMany({ where: { organizationId: input.organizationId } });

    await provisioner.registerSubdomain(validated.slug, stack.internalHost);

    return { tenantUrl: url, tenantUserId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provisioning failed";
    await controlPrisma.organization.update({
      where: { id: input.organizationId },
      data: { status: "FAILED" },
    });
    await controlPrisma.provisioningJob.update({
      where: { id: job.id },
      data: { status: "FAILED", errorLog: message },
    });
    throw error;
  }
}

export { getBaseDomain };
