import { Decimal } from "@prisma/client/runtime/library";

export function decToNumber(value: Decimal | number | null | undefined | unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    return (value as Decimal).toNumber();
  }
  return Number(value);
}

export function toDecimal(n: number): Decimal {
  return new Decimal(n);
}
