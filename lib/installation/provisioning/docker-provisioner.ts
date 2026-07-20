import { execSync } from "child_process";
import { getBaseDomain, tenantUrl } from "@/lib/deployment";
import type { TenantProvisioner, TenantStackInput, TenantStackResult } from "@/lib/installation/provisioning/types";
import { validateSlug } from "@/lib/installation/slug";

function adminDatabaseUrl(): URL {
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error("DATABASE_URL is not configured");
  return new URL(base);
}

function tenantDatabaseName(slug: string): string {
  const safe = slug.replace(/[^a-z0-9_]/g, "_");
  return `kartin_${safe}`;
}

function buildTenantUrl(slug: string): string {
  const template = process.env.TENANT_DATABASE_URL_TEMPLATE;
  if (template) return template.replace("{slug}", slug);

  const admin = adminDatabaseUrl();
  admin.pathname = `/${tenantDatabaseName(slug)}`;
  return admin.toString();
}

async function ensureTenantDatabase(slug: string): Promise<string> {
  const tenantUrl = buildTenantUrl(slug);

  if (process.env.NODE_ENV !== "production") {
    return tenantUrl;
  }

  const admin = adminDatabaseUrl();
  const dbName = tenantDatabaseName(slug);
  const adminDb = admin.pathname.replace(/^\//, "") || "postgres";

  try {
    execSync(
      `psql "${admin.origin}/${adminDb}" -c "CREATE DATABASE \\"${dbName}\\""`,
      { stdio: "pipe" },
    );
  } catch {
    /* database may already exist */
  }

  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: tenantUrl },
    stdio: "pipe",
  });

  return tenantUrl;
}

export class DockerProvisioner implements TenantProvisioner {
  async createTenantStack(input: TenantStackInput): Promise<TenantStackResult> {
    const validated = validateSlug(input.slug);
    if (!validated.ok) throw new Error(validated.error);

    const tenantDatabaseUrl = await ensureTenantDatabase(validated.slug);
    const internalHost = process.env.TENANT_INTERNAL_HOST ?? "kartin-app";

    return { tenantDatabaseUrl, internalHost };
  }

  async registerSubdomain(slug: string, targetHost: string): Promise<void> {
    const validated = validateSlug(slug);
    if (!validated.ok) throw new Error(validated.error);

    const host = `${validated.slug}.${getBaseDomain()}`;
    const log = {
      host,
      targetHost,
      tenantUrl: tenantUrl(validated.slug),
      registeredAt: new Date().toISOString(),
    };

    if (process.env.NGINX_SITES_DIR) {
      const conf = [
        `server {`,
        `  listen 80;`,
        `  server_name ${host};`,
        `  location / {`,
        `    proxy_pass http://${targetHost};`,
        `    proxy_set_header Host $host;`,
        `    proxy_set_header X-Real-IP $remote_addr;`,
        `  }`,
        `}`,
        "",
      ].join("\n");

      try {
        execSync(`printf '%s' ${JSON.stringify(conf)} > "${process.env.NGINX_SITES_DIR}/${validated.slug}.conf"`, {
          shell: "/bin/sh",
          stdio: "pipe",
        });
        if (process.env.NGINX_RELOAD_CMD) {
          execSync(process.env.NGINX_RELOAD_CMD, { stdio: "pipe" });
        }
      } catch (error) {
        console.warn("[DockerProvisioner] nginx config write failed:", error);
      }
    }

    console.info("[DockerProvisioner] Subdomain registered:", log);
  }

  async validateSubdomain(slug: string): Promise<boolean> {
    const validated = validateSlug(slug);
    return validated.ok;
  }
}

export function getTenantProvisioner(): TenantProvisioner {
  return new DockerProvisioner();
}
