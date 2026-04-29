import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/actions";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    // Use a top level transaction to ensure all or nothing
    await prisma.$transaction(async (tx) => {
      // 1. Settings / Users / DeviceTypes / Devices
      if (data.users || data.deviceTypes || data.devices) {
        if (data.users) {
          // Delete all users EXCEPT the current admin doing the restore
          await tx.user.deleteMany({ where: { id: { not: user.id } } });
          const usersToCreate = data.users.filter((u: any) => u.id !== user.id && u.username !== user.username);
          if (usersToCreate.length > 0) {
            await tx.user.createMany({ data: usersToCreate });
          }
        }
        if (data.deviceTypes) {
          await tx.deviceType.deleteMany();
          await tx.deviceType.createMany({ data: data.deviceTypes });
        }
        if (data.devices) {
          await tx.device.deleteMany();
          await tx.device.createMany({ data: data.devices });
        }
      }

      // 2. Inventory
      if (data.inventoryItems) {
        await tx.inventoryItem.deleteMany();
        await tx.inventoryItem.createMany({ data: data.inventoryItems });
      }

      // 3. Reports (Sessions, Orders, Sales)
      // Must be done in order considering foreign keys
      if (data.sessions || data.sales) {
        if (data.orders) await tx.order.deleteMany();
        if (data.sessionSegments) await tx.sessionSegment.deleteMany();
        if (data.sessions) await tx.session.deleteMany();
        if (data.saleItems) await tx.saleItem.deleteMany();
        if (data.sales) await tx.sale.deleteMany();

        if (data.sessions) await tx.session.createMany({ data: data.sessions });
        if (data.sessionSegments) await tx.sessionSegment.createMany({ data: data.sessionSegments });
        if (data.orders) await tx.order.createMany({ data: data.orders });
        if (data.sales) await tx.sale.createMany({ data: data.sales });
        if (data.saleItems) await tx.saleItem.createMany({ data: data.saleItems });
      }

      // 4. Financial Transactions
      if (data.financialTransactions) {
        await tx.financialTransaction.deleteMany();
        await tx.financialTransaction.createMany({ data: data.financialTransactions });
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Backup import error:", err);
    return NextResponse.json({ error: "Import failed", details: err.message }, { status: 500 });
  }
}
