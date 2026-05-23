/**
 * Unified security helpers.
 * Re-exports existing guards plus new helpers for consistent tenant isolation.
 */
import { getAuthJwtPayload, type AuthJwtPayload } from "@/lib/tenant-guard";
import { getCurrentUser, type AuthUser } from "@/app/actions/auth.actions";
import {
  requireAuthUser,
  requireAdmin,
  requirePermission,
  requirePermissionAsync,
  requireAdminAsync,
} from "@/lib/action-guards";
import { getTenantWhereForRead, requireWritableTenantContext } from "@/lib/tenant-scope";

export type { AuthUser, AuthJwtPayload };

export {
  getAuthJwtPayload,
  getCurrentUser,
  requireAuthUser,
  requireAdmin,
  requirePermission,
  requirePermissionAsync,
  requireAdminAsync,
  getTenantWhereForRead,
  requireWritableTenantContext,
};

/**
 * Verify the caller is a SUPER_ADMIN. Throws if not.
 */
export async function requireSuperAdmin(): Promise<AuthUser> {
  const user = await requireAuthUser();
  if (user.role !== "SUPER_ADMIN") {
    throw new Error("Forbidden: SUPER_ADMIN role required");
  }
  return user;
}

/**
 * Verify the caller has ADMIN or SUPER_ADMIN role.
 */
export async function requireAnyAdmin(): Promise<AuthUser> {
  const user = await requireAuthUser();
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    throw new Error("Forbidden: ADMIN or SUPER_ADMIN role required");
  }
  return user;
}

/**
 * Verify the caller matches the given tenant OR is SUPER_ADMIN.
 * Throws if not authorized for the tenant.
 */
export async function requireTenantAccess(tenantId: string): Promise<AuthUser> {
  const user = await requireAuthUser();
  if (user.role === "SUPER_ADMIN") return user;
  if (user.tenantId === tenantId) return user;
  throw new Error("Forbidden: you do not have access to this tenant's data");
}

/**
 * Verify the caller is ADMIN of the SAME tenant (or SUPER_ADMIN).
 * Use this for destructive tenant-scoped operations.
 */
export async function requireTenantAdmin(): Promise<AuthUser> {
  const user = await requireAuthUser();
  if (user.role === "SUPER_ADMIN") return user;
  if (user.role === "ADMIN" && user.tenantId) return user;
  throw new Error("Forbidden: ADMIN role with tenant context required");
}
