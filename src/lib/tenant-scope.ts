import { assertWritableTenant, getAuthJwtPayload, tenantWhere } from "@/lib/tenant-guard";

/** Prisma `where` fragment for models scoped by `tenantId` (empty object = legacy single-tenant / no filter). */
export async function getTenantWhereForRead(): Promise<Record<string, never> | { tenantId: string }> {
  const jwt = await getAuthJwtPayload();
  return tenantWhere(jwt?.tenantId ?? null);
}

/** Call at the start of server mutations; enforces trial/subscription when JWT has `tenantId`. */
export async function requireWritableTenantContext() {
  return assertWritableTenant();
}

export async function getJwtTenantId(): Promise<string | null> {
  const jwt = await getAuthJwtPayload();
  return jwt?.tenantId ?? null;
}
