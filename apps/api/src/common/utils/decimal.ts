/**
 * Hours are Decimal columns (float sums drift), but the API speaks plain JSON
 * numbers. Every hours value crosses that boundary here.
 */
export function decimalToNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && 'toNumber' in (value as object)) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}
