export type TenantStackInput = {
  slug: string;
  organizationId: string;
};

export type TenantStackResult = {
  tenantDatabaseUrl: string;
  internalHost: string;
};

export interface TenantProvisioner {
  createTenantStack(input: TenantStackInput): Promise<TenantStackResult>;
  registerSubdomain(slug: string, targetHost: string): Promise<void>;
  validateSubdomain(slug: string): Promise<boolean>;
}
