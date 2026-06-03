/**
 * Shared Billing Utility
 * Enforces centralized cost calculation logic and 15-minute minimum charge.
 */

function n(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "object" && v !== null && "toNumber" in v) {
    return (v as { toNumber: () => number }).toNumber();
  }
  return Number(v);
}

export const MIN_CHARGE_MINUTES = 0; // Removed minimum charge, calculate per minute.
export const MIN_CHARGE_HOURS = MIN_CHARGE_MINUTES / 60; // 0.25

export interface SessionSegmentData {
  deviceName: string;
  deviceType: string;
  mode: string;
  cost: number | unknown;
}

export interface SessionData {
  startTime: Date | string;
  lastRateChangeTime: Date | string | null;
  lastHeartbeat?: Date | string | null;
  endTime?: Date | string | null;
  isActive: boolean;
  isMulti: boolean;
  type: string;
  durationMinutes?: number | null;
  accumulatedTimeCost: number | unknown;
  accumulatedSingleCost?: number | unknown;
  accumulatedMultiCost?: number | unknown;
  segments?: SessionSegmentData[];
}

const HEARTBEAT_STALE_MS = 5 * 60 * 1000; // 5 minutes

export interface DeviceData {
  number?: string;
  type?: string;
  hourlyRateSingle: number | unknown;
  hourlyRateMulti: number | unknown;
  pricingMultiplier?: number;
}

/**
 * Calculates the ACTUAL raw cost of the current session segment.
 * Used for mid-session updates (like mode toggle) where we don't want to apply the floor yet.
 */
export function calculateActualElapsedCost(session: SessionData, device: DeviceData, nowOverride?: number) {
  const now = nowOverride || Date.now();
  const startTs = new Date(session.startTime).getTime();
  const lastChangeTs = new Date(session.lastRateChangeTime || session.startTime).getTime();
  
  let endTs = new Date(session.endTime!).getTime();
  if (session.isActive) {
    const heartbeatTs = session.lastHeartbeat
      ? new Date(session.lastHeartbeat).getTime()
      : now;
    endTs = (now - heartbeatTs > HEARTBEAT_STALE_MS) ? heartbeatTs : now;
  }
  
  // Cap for FIXED sessions
  if (session.type === 'FIXED' && session.durationMinutes) {
    const scheduledEnd = startTs + (session.durationMinutes * 60000);
    endTs = Math.min(endTs, scheduledEnd);
  }

  const hours = Math.max(0, (endTs - lastChangeTs) / 3600000);
  const baseRate = session.isMulti ? n(device.hourlyRateMulti) : n(device.hourlyRateSingle);
  const multiplier = device.pricingMultiplier ?? 1;
  return hours * baseRate * multiplier;
}

/**
 * Rounds a value to the nearest 0.5 LE (Egyptian Pound).
 */
export function roundToNearestHalf(value: number) {
  return Math.round(value * 2) / 2;
}

/**
 * Calculates the current gaming time cost for a session with MINIMUM CHARGE and ROUNDING applied.
 */
export function calculateSessionTimeCost(session: SessionData, device: DeviceData, nowOverride?: number) {
  const now = nowOverride || Date.now();
  const startTs = new Date(session.startTime).getTime();
  const currentSegmentCost = calculateActualElapsedCost(session, device, now);
  
  const actualTotalCost = n(session.accumulatedTimeCost) + currentSegmentCost;

  let endTs = new Date(session.endTime!).getTime();
  if (session.isActive) {
    const heartbeatTs = session.lastHeartbeat
      ? new Date(session.lastHeartbeat).getTime()
      : now;
    endTs = (now - heartbeatTs > HEARTBEAT_STALE_MS) ? heartbeatTs : now;
  }
  if (session.type === 'FIXED' && session.durationMinutes) {
    const scheduledEnd = startTs + (session.durationMinutes * 60000);
    endTs = Math.min(endTs, scheduledEnd);
  }

  const totalElapsedMs = Math.max(0, endTs - startTs);
  const totalElapsedMinutes = totalElapsedMs / 60000;

  let finalCost = actualTotalCost;

  if (totalElapsedMinutes < MIN_CHARGE_MINUTES) {
    const currentRate = (session.isMulti ? n(device.hourlyRateMulti) : n(device.hourlyRateSingle)) * (device.pricingMultiplier ?? 1);
    finalCost = MIN_CHARGE_HOURS * currentRate;
  }

  return roundToNearestHalf(finalCost);
}



/**
 * Utility to calculate breakdown (for UI display)
 */
export function getBillBreakdown(session: SessionData, device: DeviceData, nowOverride?: number) {
  const now = nowOverride || Date.now();
  const currentSegmentCost = calculateActualElapsedCost(session, device, now);

  // Group historical segments
  const segmentsMap = new Map<string, { deviceName: string, deviceType: string, mode: string, cost: number }>();

  if (session.segments) {
    session.segments.forEach(seg => {
      const key = `${seg.deviceType}-${seg.mode}`;
      if (!segmentsMap.has(key)) {
        segmentsMap.set(key, { ...seg, cost: n(seg.cost) });
      } else {
        segmentsMap.get(key)!.cost += n(seg.cost);
      }
    });
  }

  // Add current active segment
  const currentMode = session.isMulti ? 'MULTI' : 'SINGLE';
  const currentKey = `${device.type || 'Unknown'}-${currentMode}`;
  
  if (!segmentsMap.has(currentKey)) {
    segmentsMap.set(currentKey, {
      deviceName: device.number || 'Unknown',
      deviceType: device.type || 'Unknown',
      mode: currentMode,
      cost: currentSegmentCost
    });
  } else {
    segmentsMap.get(currentKey)!.cost += currentSegmentCost;
  }

  // Convert map to array and round costs
  const segmentBreakdown = Array.from(segmentsMap.values()).map(seg => ({
    ...seg,
    cost: roundToNearestHalf(seg.cost)
  }));

  // Also maintain backward-compatible single/multi totals for legacy
  let singleGaming = n(session.accumulatedSingleCost);
  let multiGaming = n(session.accumulatedMultiCost);
  
  if (session.isMulti) {
    multiGaming += currentSegmentCost;
  } else {
    singleGaming += currentSegmentCost;
  }

  const gamingTotal = roundToNearestHalf(singleGaming + multiGaming);
  // Exclude deleted orders and pending/cancelled orders from cost calculation (business rule: deleted/pending orders aren't charged)
  const itemsCost =
    (session as { orders?: { priceAtTime: unknown; quantity: number; isDeleted?: boolean; status?: string }[] }).orders
      ?.filter(o => (!('isDeleted' in o) || !o.isDeleted) && (!('status' in o) || o.status === 'DELIVERED'))
      ?.reduce((acc, o) => acc + n(o.priceAtTime) * o.quantity, 0) || 0;

  const subtotal = gamingTotal + itemsCost;

  return {
    single: roundToNearestHalf(singleGaming),
    multi: roundToNearestHalf(multiGaming),
    gaming: gamingTotal,
    items: itemsCost,
    subtotal,
    total: subtotal,
    segments: segmentBreakdown
  };
}
