import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/actions";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { settings, inventory, reports, finance } = body;

    const exportData: any = {
      exportDate: new Date().toISOString()
    };

    if (settings) {
      exportData.users = await prisma.user.findMany();
      exportData.deviceTypes = await prisma.deviceType.findMany();
      exportData.devices = await prisma.device.findMany();
    }

    if (inventory) {
      exportData.inventoryItems = await prisma.inventoryItem.findMany();
    }

    if (reports) {
      exportData.sessions = await prisma.session.findMany();
      exportData.sessionSegments = await prisma.sessionSegment.findMany();
      exportData.orders = await prisma.order.findMany();
      exportData.sales = await prisma.sale.findMany();
      exportData.saleItems = await prisma.saleItem.findMany();
    }

    if (finance) {
      exportData.financialTransactions = await prisma.financialTransaction.findMany();
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
