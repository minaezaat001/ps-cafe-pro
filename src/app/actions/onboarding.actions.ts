"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function signup(data: any) {
  const { name, email, username, password } = data;

  try {
    // 1. Check if tenant or user already exists
    const existingTenant = await prisma.tenant.findUnique({ where: { email } });
    if (existingTenant) throw new Error("A business with this email already exists.");

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) throw new Error("Username is already taken.");

    // 2. Create Tenant and User in a transaction
    const hashedPassword = await bcrypt.hash(password, 10);
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7); // 7 days trial

    const result = await prisma.$transaction(async (tx) => {
      // Create the tenant
      const tenant = await tx.tenant.create({
        data: {
          name,
          email,
          passwordHash: hashedPassword, // Store for recovery or reference
          trialEndDate,
          isSubscribed: false,
          isOnboarded: false,
        },
      });

      // Create the admin user for this tenant
      const user = await tx.user.create({
        data: {
          username,
          password: hashedPassword,
          role: 'ADMIN',
          tenantId: tenant.id,
        },
      });

      // 3. Create Default Tenant Settings
      await tx.tenantSettings.create({
        data: {
          tenantId: tenant.id,
          currency: "EGP",
          currencySymbol: "ج.م",
          timezone: "Africa/Cairo"
        }
      });

      // Seed default device types for the new tenant
      await tx.deviceType.createMany({
        data: [
          { name: 'PlayStation 5', color: 'blue', icon: 'Gamepad2', tenantId: tenant.id },
          { name: 'PlayStation 4', color: 'indigo', icon: 'Gamepad', tenantId: tenant.id },
          { name: 'VIP Room', color: 'purple', icon: 'Crown', tenantId: tenant.id },
        ],
      });

      return { tenant, user };
    });

    return { success: true };
  } catch (err: any) {
    console.error("Signup error:", err);
    throw new Error(err.message || "Failed to create account");
  }
}
