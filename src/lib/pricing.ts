import prisma from "./prisma";
import { decToNumber } from "./decimals";

export async function getActivePricingMultiplier(tenantId?: string | null): Promise<number> {
  if (!tenantId) return 1;

  const now = new Date();
  const currentHour = now.getHours().toString().padStart(2, "0");
  const currentMin = now.getMinutes().toString().padStart(2, "0");
  const currentTime = `${currentHour}:${currentMin}`;
  const currentDay = now.getDay();

  const tiers = await prisma.pricingTier.findMany({ where: { tenantId } });
  if (tiers.length === 0) return 1;

  for (const tier of tiers) {
    if (tier.dayOfWeek !== null && tier.dayOfWeek !== currentDay) continue;
    if (tier.startTime && tier.endTime) {
      if (currentTime < tier.startTime || currentTime > tier.endTime) continue;
    }
    return decToNumber(tier.multiplier);
  }

  return 1;
}
