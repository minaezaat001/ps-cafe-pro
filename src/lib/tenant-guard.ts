import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

export type AuthJwtPayload = {
  id: string;
  username: string;
  role: string;
  tenantId?: string | null;
};

export async function getAuthJwtPayload(): Promise<AuthJwtPayload | null> {
  try {
    const cookieStore = await cookies();
    const auth = cookieStore.get("auth_user");
    if (!auth?.value) return null;
    const payload = await verifyAccessToken(auth.value);
    return payload as AuthJwtPayload | null;
  } catch {
    return null;
  }
}

export function tenantWhere(tenantId: string | null | undefined): { tenantId: string } | Record<string, never> {
  if (tenantId) return { tenantId };
  return {};
}

/** Blocks mutations when trial ended and not subscribed. Legacy users (no tenantId) are unrestricted. */
export async function assertWritableTenant(options?: { skipTrialCheck?: boolean }) {
  const jwt = await getAuthJwtPayload();
  if (!jwt?.tenantId) return { jwt, tenantId: null as string | null };

  if (options?.skipTrialCheck) {
    return { jwt, tenantId: jwt.tenantId };
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: jwt.tenantId } });
  if (!tenant) return { jwt, tenantId: jwt.tenantId };

  if (!tenant.isSubscribed && tenant.trialEndDate < new Date()) {
    throw new Error("Your trial has ended. Subscribe to continue making changes.");
  }

  return { jwt, tenantId: jwt.tenantId };
}

export async function getTrialBannerState(): Promise<{
  visible: boolean;
  expired: boolean;
  subscribed: boolean;
  daysRemaining: number;
} | null> {
  const jwt = await getAuthJwtPayload();
  if (!jwt?.tenantId) return null;

  const tenant = await prisma.tenant.findUnique({
    where: { id: jwt.tenantId },
    select: { trialEndDate: true, isSubscribed: true },
  });
  if (!tenant) return null;

  const now = new Date();
  const end = new Date(tenant.trialEndDate);
  const ms = end.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  const expired = !tenant.isSubscribed && end < now;

  return {
    visible: !tenant.isSubscribed,
    expired,
    subscribed: tenant.isSubscribed,
    daysRemaining,
  };
}
