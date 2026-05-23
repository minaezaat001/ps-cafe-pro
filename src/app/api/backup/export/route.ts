import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/actions";
import { getTenantWhereForRead } from "@/lib/tenant-scope";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // SUPER_ADMIN exports all data; ADMIN exports only their tenant
    let tenantFilter: Record<string, any> = {};
    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    if (isSuperAdmin) {
      tenantFilter = {};
    } else if (user.tenantId) {
      tenantFilter = { tenantId: user.tenantId };
    } else {
      tenantFilter = await getTenantWhereForRead();
    }

    const body = await request.json();
    const { settings, inventory, reports, finance } = body;

    const exportData: any = {
      exportDate: new Date().toISOString(),
      exportedTenantId: tenantFilter.tenantId || null,
    };

    if (settings) {
      exportData.users = await prisma.user.findMany({ where: tenantFilter });
      exportData.deviceTypes = await prisma.deviceType.findMany({ where: tenantFilter });
      exportData.devices = await prisma.device.findMany({ where: tenantFilter });
    }

    if (inventory) {
      exportData.inventoryItems = await prisma.inventoryItem.findMany({ where: tenantFilter });
    }

    if (reports) {
      exportData.sessions = await prisma.session.findMany({ where: tenantFilter });
      exportData.sessionSegments = await prisma.sessionSegment.findMany({ where: tenantFilter });
      exportData.orders = await prisma.order.findMany({ where: tenantFilter });
      exportData.sales = await prisma.sale.findMany({ where: tenantFilter });
      exportData.saleItems = await prisma.saleItem.findMany({ where: tenantFilter });
    }

    if (finance) {
      exportData.financialTransactions = await prisma.financialTransaction.findMany({ where: tenantFilter });
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="ps_cafe_backup.json"'
      }
    });
  } catch (err: any) {
    console.error("Backup export error:", err);
    return NextResponse.json({ error: "Export failed", details: err.message }, { status: 500 });
  }
}
