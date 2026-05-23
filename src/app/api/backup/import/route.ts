import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/actions";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // SUPER_ADMIN can import globally; ADMIN scoped to their tenant
    let importTenantId: string | null = null;
    if (user.role === "ADMIN" && user.tenantId) {
      importTenantId = user.tenantId;
    }

    const data = await request.json();

    // Use a top level transaction to ensure all or nothing
    await prisma.$transaction(async (tx) => {
      // Scope: only SUPER_ADMIN can import across tenants
      const whereFilter = importTenantId ? { tenantId: importTenantId } : {};

      // 1. Settings / Users / DeviceTypes / Devices
      if (data.users || data.deviceTypes || data.devices) {
        if (data.users) {
          const userWhere = importTenantId
            ? { id: { not: user.id }, tenantId: importTenantId }
            : { id: { not: user.id } };
          await tx.user.deleteMany({ where: userWhere });
          const usersToCreate = data.users
            .filter((u: any) => u.id !== user.id && u.username !== user.username)
            .map((u: any) => importTenantId ? { ...u, tenantId: importTenantId } : u);
          if (usersToCreate.length > 0) {
            await tx.user.createMany({ data: usersToCreate });
          }
        }
        if (data.deviceTypes) {
          await tx.deviceType.deleteMany({ where: whereFilter });
          const typesToCreate = data.deviceTypes.map((t: any) => importTenantId ? { ...t, tenantId: importTenantId } : t);
          await tx.deviceType.createMany({ data: typesToCreate });
        }
        if (data.devices) {
          await tx.device.deleteMany({ where: whereFilter });
          const devicesToCreate = data.devices.map((d: any) => importTenantId ? { ...d, tenantId: importTenantId } : d);
          await tx.device.createMany({ data: devicesToCreate });
        }
      }

      // 2. Inventory
      if (data.inventoryItems) {
        await tx.inventoryItem.deleteMany({ where: whereFilter });
        const itemsToCreate = data.inventoryItems.map((i: any) => importTenantId ? { ...i, tenantId: importTenantId } : i);
        await tx.inventoryItem.createMany({ data: itemsToCreate });
      }

      // 3. Reports (Sessions, Orders, Sales)
      if (data.sessions || data.sales) {
        if (data.orders) await tx.order.deleteMany({ where: whereFilter });
        if (data.sessionSegments) await tx.sessionSegment.deleteMany({ where: whereFilter });
        if (data.sessions) await tx.session.deleteMany({ where: whereFilter });
        if (data.saleItems) await tx.saleItem.deleteMany({ where: whereFilter });
        if (data.sales) await tx.sale.deleteMany({ where: whereFilter });

        const mapTenant = (arr: any[]) => arr.map((x: any) => importTenantId ? { ...x, tenantId: importTenantId } : x);
        if (data.sessions) await tx.session.createMany({ data: mapTenant(data.sessions) });
        if (data.sessionSegments) await tx.sessionSegment.createMany({ data: mapTenant(data.sessionSegments) });
        if (data.orders) await tx.order.createMany({ data: mapTenant(data.orders) });
        if (data.sales) await tx.sale.createMany({ data: mapTenant(data.sales) });
        if (data.saleItems) await tx.saleItem.createMany({ data: mapTenant(data.saleItems) });
      }

      // 4. Financial Transactions
      if (data.financialTransactions) {
        await tx.financialTransaction.deleteMany({ where: whereFilter });
        const txToCreate = data.financialTransactions.map((ft: any) => importTenantId ? { ...ft, tenantId: importTenantId } : ft);
        await tx.financialTransaction.createMany({ data: txToCreate });
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Backup import error:", err);
    return NextResponse.json({ error: "Import failed", details: err.message }, { status: 500 });
  }
}
