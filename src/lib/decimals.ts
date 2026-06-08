export function decToNumber(value: number | null | undefined | unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    return (value as { toNumber(): number }).toNumber();
  }
  return Number(value);
}

export function toDecimal(n: number): number {
  return n;
}
