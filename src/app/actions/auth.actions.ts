"use server";

import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export type AuthUser = {
  id: string;
  username: string;
  role: string;
  permissions: string[];
  tenantId?: string | null;
};

export async function login(username: string, password: string) {
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      throw new Error("Invalid username or password");
    }

    let isValid = false;
    if (!user.password.startsWith("$2")) {
      if (user.password === password) {
        isValid = true;
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword },
        });
      }
    } else {
      isValid = await bcrypt.compare(password, user.password);
    }

    if (!isValid) {
      throw new Error("Invalid username or password");
    }

    const permissionsStr = user.permissions || "[]";
    let permissions: string[] = [];
    try {
      permissions = JSON.parse(permissionsStr) as string[];
    } catch {
      permissions = [];
    }

    const accessTokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      permissions,
      tenantId: user.tenantId ?? null,
    };
    
    const accessToken = await signAccessToken(accessTokenPayload);
    const refreshToken = await signRefreshToken(accessTokenPayload);

    const cookieStore = await cookies();
    // Set access token cookie (short-lived)
    cookieStore.set("auth_user", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60, // 1 hour
      path: "/",
      sameSite: 'lax'
    });
    
    // Set refresh token cookie (longer-lived)
    cookieStore.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
      sameSite: 'lax'
    });

    return user;
  } catch (err) {
    console.error("Login error:", err);
    throw err;
  }
}

export async function logout() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("auth_user");
  } catch (err) {
    console.error("Logout error:", err);
  }
  redirect("/login");
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const auth = cookieStore.get("auth_user");
    if (!auth) return null;
    const payload = await verifyAccessToken(auth.value);
    if (!payload) return null;

    const dbUser = await prisma.user.findUnique({
      where: { id: String(payload.id) }
    });

    if (!dbUser) {
      return null;
    }

    let permissions: string[] = [];
    try {
      if (dbUser.permissions) permissions = JSON.parse(dbUser.permissions);
    } catch {
      // Ignore
    }

    return {
      id: dbUser.id,
      username: dbUser.username,
      role: dbUser.role,
      permissions,
      tenantId: dbUser.tenantId ?? null,
    };
  } catch {
    return null;
  }
}
import { getTrialBannerState } from "@/lib/tenant-guard";

export async function getTrialStatus() {
  return await getTrialBannerState();
}
