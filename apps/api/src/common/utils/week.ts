/**
 * Normalizes any date to the Monday of its ISO week, at UTC midnight.
 *
 * Every `weekStart` written to the database goes through here, so a client can
 * never define its own week boundary and week-grouped charts can group on the
 * column with no date maths in SQL. Mirrored for the web in
 * packages/shared/src/week.ts — keep the two in sync.
 */
export function toWeekStart(date: Date | string): Date {
  const source = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(source.getTime())) {
    throw new RangeError(`Invalid date: ${String(date)}`);
  }
  const dt = new Date(
    Date.UTC(source.getUTCFullYear(), source.getUTCMonth(), source.getUTCDate()),
  );
  const day = dt.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt;
}

/** The Monday `offset` weeks from the given week (negative = earlier). */
export function shiftWeek(date: Date | string, offset: number): Date {
  const start = toWeekStart(date);
  start.setUTCDate(start.getUTCDate() + offset * 7);
  return start;
}

/** True once the week containing `date` has finished. */
export function isWeekOver(date: Date | string, now: Date = new Date()): boolean {
  return now.getTime() >= shiftWeek(date, 1).getTime();
}
