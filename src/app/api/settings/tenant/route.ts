import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getTenantWhereForRead, requireWritableTenantContext } from '@/lib/tenant-scope';
import { createAuditLog } from '@/lib/audit';

// GET - Fetch tenant settings
export async function GET(request: Request) {
  try {
    const tenantFilter = await getTenantWhereForRead();
    
    if (!tenantFilter?.tenantId) {
      return NextResponse.json({
        currency: "EGp",
        currencySymbol: "ج.م",
        timezone: "Africa/Cairo"
      });
    }
    
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId: tenantFilter.tenantId }
    });
    
    if (!settings) {
      return NextResponse.json({
        currency: "EGp",
        currencySymbol: "ج.م",
        timezone: "Africa/Cairo"
      });
    }
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to fetch tenant settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// POST - Update tenant settings
export async function POST(request: Request) {
  try {
    const tenantContext = await requireWritableTenantContext();
    const body = await request.json();
    const { currency, currencySymbol, timezone, reason } = body;
    
    if (!tenantContext.tenantId) {
      return NextResponse.json(
        { error: 'No tenant context found' },
        { status: 400 }
      );
    }
    
    // Get current settings for audit
    const currentSettings = await prisma.tenantSettings.findUnique({
      where: { tenantId: tenantContext.tenantId }
    });
    
    const settings = await prisma.tenantSettings.upsert({
      where: { tenantId: tenantContext.tenantId },
      update: {
        currency: currency || "EGp",
        currencySymbol: currencySymbol || "ج.م",
        timezone: timezone || "Africa/Cairo",
      },
      create: {
        tenantId: tenantContext.tenantId,
        currency: currency || "EGp",
        currencySymbol: currencySymbol || "ج.م",
        timezone: timezone || "Africa/Cairo",
      },
    });
    
    // Create audit log
    await createAuditLog({
      action: "CHANGE_SETTING",
      entityType: "TenantSettings",
      entityId: "tenant-settings",
      reason: reason || "Tenant settings updated",
      metadata: {
        previousSettings: currentSettings ? {
          currency: currentSettings.currency,
          currencySymbol: currentSettings.currencySymbol,
          timezone: currentSettings.timezone
        } : null,
        newSettings: { currency, currencySymbol, timezone },
        timestamp: new Date().toISOString()
      }
    });
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to update tenant settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}