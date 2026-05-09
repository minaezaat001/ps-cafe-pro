import { decToNumber } from "@/lib/decimals";

/** Plain JSON shape for dashboard / polling (no Prisma Decimal instances). */
export type DashboardDeviceSnapshot = {
  id: string;
  number: string;
  type: string;
  hourlyRateSingle: number;
  hourlyRateMulti: number;
  sessions: DashboardSessionSnapshot[];
};

export type DashboardShiftSnapshot = {
  id: string;
  openedAt: string;
  closedAt: string | null;
  openedByUserId: string;
  closedByUserId: string | null;
  openingFloat: number;
  expectedCash: number;
  actualCash: number | null;
  variance: number | null;
  status: string;
  openedByUser?: { id: string; username: string; role: string };
};

export type DashboardSessionSnapshot = {
  id: string;
  deviceId: string;
  userId: string;
  endedByUserId: string | null;
  startTime: string;
  endTime: string | null;
  type: string;
  durationMinutes: number | null;
  isMulti: boolean;
  isActive: boolean;
  accumulatedTimeCost: number;
  accumulatedSingleCost: number;
  accumulatedMultiCost: number;
  lastRateChangeTime: string;
  shiftId: string | null;
  orders: {
    id: string;
    quantity: number;
    priceAtTime: number;
    status: string;
    inventoryItem: { id: string; name: string; category: string; price: number };
  }[];
  segments: {
    id: string;
    deviceName: string;
    deviceType: string;
    mode: string;
    startTime: string;
    endTime: string;
    durationMins: number;
    cost: number;
  }[];
  device: {
    id: string;
    number: string;
    type: string;
    hourlyRateSingle: number;
    hourlyRateMulti: number;
  };
};

export function serializeDashboardDevice(device: {
  id: string;
  number: string;
  type: string;
  hourlyRateSingle: unknown;
  hourlyRateMulti: unknown;
  sessions: Array<{
    id: string;
    deviceId: string;
    userId: string;
    endedByUserId: string | null;
    startTime: Date;
    endTime: Date | null;
    type: string;
    durationMinutes: number | null;
    isMulti: boolean;
    isActive: boolean;
    accumulatedTimeCost: unknown;
    accumulatedSingleCost: unknown;
    accumulatedMultiCost: unknown;
    lastRateChangeTime: Date;
    shiftId: string | null;
    orders: Array<{
      id: string;
      quantity: number;
      priceAtTime: unknown;
      status: string;
      inventoryItem: { id: string; name: string; category: string; price: unknown };
    }>;
    segments: Array<{
      id: string;
      deviceName: string;
      deviceType: string;
      mode: string;
      startTime: Date;
      endTime: Date;
      durationMins: number;
      cost: unknown;
    }>;
    device: {
      id: string;
      number: string;
      type: string;
      hourlyRateSingle: unknown;
      hourlyRateMulti: unknown;
    };
  }>;
}): DashboardDeviceSnapshot {
  return {
    id: device.id,
    number: device.number,
    type: device.type,
    hourlyRateSingle: decToNumber(device.hourlyRateSingle),
    hourlyRateMulti: decToNumber(device.hourlyRateMulti),
    sessions: device.sessions.map((s) => ({
      id: s.id,
      deviceId: s.deviceId,
      userId: s.userId,
      endedByUserId: s.endedByUserId,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime?.toISOString() ?? null,
      type: s.type,
      durationMinutes: s.durationMinutes,
      isMulti: s.isMulti,
      isActive: s.isActive,
      accumulatedTimeCost: decToNumber(s.accumulatedTimeCost),
      accumulatedSingleCost: decToNumber(s.accumulatedSingleCost),
      accumulatedMultiCost: decToNumber(s.accumulatedMultiCost),
      lastRateChangeTime: s.lastRateChangeTime.toISOString(),
      shiftId: s.shiftId,
      orders: s.orders.map((o) => ({
        id: o.id,
        quantity: o.quantity,
        priceAtTime: decToNumber(o.priceAtTime),
        status: o.status,
        inventoryItem: {
          id: o.inventoryItem.id,
          name: o.inventoryItem.name,
          category: o.inventoryItem.category,
          price: decToNumber(o.inventoryItem.price),
        },
      })),
      segments: s.segments.map((seg) => ({
        id: seg.id,
        deviceName: seg.deviceName,
        deviceType: seg.deviceType,
        mode: seg.mode,
        startTime: seg.startTime.toISOString(),
        endTime: seg.endTime.toISOString(),
        durationMins: seg.durationMins,
        cost: decToNumber(seg.cost),
      })),
      device: {
        id: s.device.id,
        number: s.device.number,
        type: s.device.type,
        hourlyRateSingle: decToNumber(s.device.hourlyRateSingle),
        hourlyRateMulti: decToNumber(s.device.hourlyRateMulti),
      },
    })),
  };
}

export function snapshotRevision(devices: DashboardDeviceSnapshot[]): string {
  return devices
    .map((d) => {
      const s = d.sessions[0];
      if (!s) return `${d.id}:idle`;
      const orderSig = s.orders.map((o) => `${o.id}:${o.quantity}`).join(",");
      return `${d.id}:${s.id}:${s.lastRateChangeTime}:${orderSig}:${s.isMulti}:${s.accumulatedTimeCost}:${s.accumulatedSingleCost}:${s.accumulatedMultiCost}`;
    })
    .join("|");
}

export function serializeShift(shift: any): DashboardShiftSnapshot | null {
  if (!shift) return null;
  return {
    id: shift.id,
    openedAt: shift.openedAt.toISOString(),
    closedAt: shift.closedAt?.toISOString() ?? null,
    openedByUserId: shift.openedByUserId,
    closedByUserId: shift.closedByUserId,
    openingFloat: decToNumber(shift.openingFloat),
    expectedCash: decToNumber(shift.expectedCash),
    actualCash: decToNumber(shift.actualCash),
    variance: decToNumber(shift.variance),
    status: shift.status,
    openedByUser: shift.openedByUser ? {
      id: shift.openedByUser.id,
      username: shift.openedByUser.username,
      role: shift.openedByUser.role,
    } : undefined,
  };
}

export function serializeFinancialTransaction(tx: any) {
  if (!tx) return null;
  return {
    ...tx,
    amount: decToNumber(tx.amount),
    createdAt: tx.createdAt.toISOString(),
    user: tx.user ? {
      id: tx.user.id,
      username: tx.user.username,
      role: tx.user.role,
    } : undefined,
    shift: tx.shift ? serializeShift(tx.shift) : undefined,
  };
}

export function serializeReportData(data: any) {
  return {
    sessions: (data.sessions || []).map((s: any) => ({
      ...s,
      accumulatedTimeCost: decToNumber(s.accumulatedTimeCost),
      accumulatedSingleCost: decToNumber(s.accumulatedSingleCost),
      accumulatedMultiCost: decToNumber(s.accumulatedMultiCost),
      startTime: s.startTime.toISOString(),
      endTime: s.endTime?.toISOString() ?? null,
      lastRateChangeTime: s.lastRateChangeTime ? s.lastRateChangeTime.toISOString() : undefined,
      device: s.device ? { 
        id: s.device.id, 
        number: s.device.number,
        type: s.device.type,
        hourlyRateSingle: decToNumber(s.device.hourlyRateSingle),
        hourlyRateMulti: decToNumber(s.device.hourlyRateMulti),
      } : undefined,
      orders: (s.orders || []).map((o: any) => ({
        ...o,
        priceAtTime: decToNumber(o.priceAtTime),
        createdAt: o.createdAt ? o.createdAt.toISOString() : undefined,
        inventoryItem: o.inventoryItem ? {
          ...o.inventoryItem,
          price: decToNumber(o.inventoryItem.price),
        } : undefined,
      })),
      segments: (s.segments || []).map((seg: any) => ({
        ...seg,
        cost: decToNumber(seg.cost),
        startTime: seg.startTime?.toISOString(),
        endTime: seg.endTime?.toISOString(),
      })),
    })),
    sales: (data.sales || []).map((s: any) => ({
      ...s,
      totalAmount: decToNumber(s.totalAmount),
      createdAt: s.createdAt.toISOString(),
      items: (s.items || []).map((i: any) => ({
        ...i,
        priceAtTime: decToNumber(i.priceAtTime),
        inventoryItem: i.inventoryItem ? {
          ...i.inventoryItem,
          price: decToNumber(i.inventoryItem.price),
        } : undefined,
      })),
    })),
    transactions: (data.transactions || []).map(serializeFinancialTransaction),
    shifts: (data.shifts || []).map(serializeShift),
  };
}
