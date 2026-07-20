import { InstallationStatus } from "@prisma/client";
import {
  getMode,
  INSTALLER_VERSION,
  isCloudMode,
  isUnifiedDev,
  resolvePlaneFromHost,
  tenantSlugFromHost,
} from "@/lib/deployment";
import { controlPrisma, isControlDbConfigured } from "@/lib/prisma-control";
import { prisma } from "@/lib/prisma";

const SINGLETON_ID = "singleton";

export type InstallationStateDTO = {
  status: InstallationStatus;
  deploymentMode: string;
  installerVersion: string;
  organizationSlug: string | null;
  completedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
};

function mapState(state: {
  status: InstallationStatus;
  deploymentMode: string;
  installerVersion: string;
  organizationSlug: string | null;
  completedAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
}): InstallationStateDTO {
  return {
    status: state.status,
    deploymentMode: state.deploymentMode,
    installerVersion: state.installerVersion,
    organizationSlug: state.organizationSlug,
    completedAt: state.completedAt?.toISOString() ?? null,
    failedAt: state.failedAt?.toISOString() ?? null,
    failureReason: state.failureReason,
  };
}

async function ensureStateRow() {
  let state = await prisma.installationState.findUnique({ where: { id: SINGLETON_ID } });
  if (state) return state;

  state = await prisma.installationState.create({
    data: {
      id: SINGLETON_ID,
      status: InstallationStatus.NOT_STARTED,
      deploymentMode: getMode(),
      installerVersion: INSTALLER_VERSION,
    },
  });
  return state;
}

/** Legacy deployments: admin exists but no install record → treat as completed. */
async function migrateLegacyInstalledState() {
  const existing = await prisma.installationState.findUnique({ where: { id: SINGLETON_ID } });
  if (existing?.status === InstallationStatus.COMPLETED) return existing;

  const adminCount = await prisma.user.count({
    where: {
      OR: [{ role: "ADMIN" }, { role: "SUPER_ADMIN" }, { isSuperAdmin: true }],
      isActive: true,
    },
  });

  if (adminCount === 0) return existing ?? (await ensureStateRow());

  return prisma.installationState.upsert({
    where: { id: SINGLETON_ID },
    update: {
      status: InstallationStatus.COMPLETED,
      deploymentMode: getMode(),
      completedAt: new Date(),
    },
    create: {
      id: SINGLETON_ID,
      status: InstallationStatus.COMPLETED,
      deploymentMode: getMode(),
      installerVersion: INSTALLER_VERSION,
      completedAt: new Date(),
    },
  });
}

export async function getInstallationState(): Promise<InstallationStateDTO> {
  const state = isCloudMode()
    ? await ensureStateRow()
    : await migrateLegacyInstalledState();
  return mapState(state);
}

async function isOrganizationActive(slug: string): Promise<boolean> {
  if (!isControlDbConfigured()) return false;
  const org = await controlPrisma.organization.findFirst({
    where: { slug, status: "ACTIVE" },
    select: { id: true },
  });
  return !!org;
}

/** Unified dev: tenant subdomains share one DB — use control plane org status. */
export async function isTenantInstallationReady(host?: string | null): Promise<boolean> {
  if (isUnifiedDev() && resolvePlaneFromHost(host) === "tenant") {
    const slug = tenantSlugFromHost(host);
    if (!slug) return false;
    return isOrganizationActive(slug);
  }
  return isInstalled();
}

export async function getTenantInstallationState(host?: string | null): Promise<InstallationStateDTO> {
  if (isUnifiedDev() && resolvePlaneFromHost(host) === "tenant") {
    const slug = tenantSlugFromHost(host);
    if (slug && (await isOrganizationActive(slug))) {
      return {
        status: InstallationStatus.COMPLETED,
        deploymentMode: getMode(),
        installerVersion: INSTALLER_VERSION,
        organizationSlug: slug,
        completedAt: new Date().toISOString(),
        failedAt: null,
        failureReason: null,
      };
    }

    const base = await getInstallationState();
    return { ...base, organizationSlug: slug ?? base.organizationSlug };
  }

  return getInstallationState();
}

export async function isInstalled(): Promise<boolean> {
  try {
    const state = await getInstallationState();
    if (state.status !== InstallationStatus.COMPLETED) return false;

    const superAdmin = await prisma.user.findFirst({
      where: {
        isActive: true,
        OR: [{ role: "SUPER_ADMIN" }, { isSuperAdmin: true }, { role: "ADMIN" }],
      },
    });
    return !!superAdmin;
  } catch {
    return false;
  }
}

export async function markInProgress(organizationSlug?: string) {
  return prisma.installationState.upsert({
    where: { id: SINGLETON_ID },
    update: {
      status: InstallationStatus.IN_PROGRESS,
      organizationSlug: organizationSlug ?? undefined,
      failedAt: null,
      failureReason: null,
    },
    create: {
      id: SINGLETON_ID,
      status: InstallationStatus.IN_PROGRESS,
      deploymentMode: getMode(),
      installerVersion: INSTALLER_VERSION,
      organizationSlug: organizationSlug ?? null,
    },
  });
}

export async function markCompleted(organizationSlug?: string) {
  return prisma.installationState.upsert({
    where: { id: SINGLETON_ID },
    update: {
      status: InstallationStatus.COMPLETED,
      organizationSlug: organizationSlug ?? undefined,
      completedAt: new Date(),
      failedAt: null,
      failureReason: null,
    },
    create: {
      id: SINGLETON_ID,
      status: InstallationStatus.COMPLETED,
      deploymentMode: getMode(),
      installerVersion: INSTALLER_VERSION,
      organizationSlug: organizationSlug ?? null,
      completedAt: new Date(),
    },
  });
}

export async function markFailed(reason: string) {
  return prisma.installationState.upsert({
    where: { id: SINGLETON_ID },
    update: {
      status: InstallationStatus.FAILED,
      failedAt: new Date(),
      failureReason: reason,
    },
    create: {
      id: SINGLETON_ID,
      status: InstallationStatus.FAILED,
      deploymentMode: getMode(),
      installerVersion: INSTALLER_VERSION,
      failedAt: new Date(),
      failureReason: reason,
    },
  });
}
