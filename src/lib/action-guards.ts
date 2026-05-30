import { getCurrentUser, type AuthUser } from "@/app/actions/auth.actions";

export type { AuthUser };

export async function requireAuthUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export function requireAdmin(user: AuthUser): void {
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") throw new Error("Unauthorized");
}

/** ADMIN/SUPER_ADMIN bypasses permission checks (full access). */
export function requirePermission(user: AuthUser, permission: string): void {
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") return;
  const perms = user.permissions ?? [];
  if (!perms.includes(permission)) {
    throw new Error("Forbidden: insufficient permissions");
  }
}

export async function requirePermissionAsync(permission: string): Promise<AuthUser> {
  const user = await requireAuthUser();
  requirePermission(user, permission);
  return user;
}

export async function requireAdminAsync(): Promise<AuthUser> {
  const user = await requireAuthUser();
  requireAdmin(user);
  return user;
}
