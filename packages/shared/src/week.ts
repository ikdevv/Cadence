/**
 * Normalizes any date to the Monday of its ISO week, at UTC midnight.
 *
 * Every `weekStart` in the system passes through this so a report week is one
 * value, never a client-supplied boundary. Mirrored in the API at
 * apps/api/src/common/utils/week.ts — keep the two in sync.
 */
export function toWeekStart(date: Date | string): Date {
  const source = typeof date === "string" ? new Date(date) : date;
  const dt = new Date(
    Date.UTC(
      source.getUTCFullYear(),
      source.getUTCMonth(),
      source.getUTCDate(),
    ),
  );
  const day = dt.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt;
}

/** `YYYY-MM-DD` for the Monday of the given date's week. */
export function toWeekStartString(date: Date | string): string {
  return toWeekStart(date).toISOString().slice(0, 10);
}

/** The Monday `offset` weeks away from the given week (negative = earlier). */
export function shiftWeek(date: Date | string, offset: number): Date {
  const start = toWeekStart(date);
  start.setUTCDate(start.getUTCDate() + offset * 7);
  return start;
}

/** The last `count` week-start dates ending with the week of `from`, oldest first. */
export function recentWeeks(count: number, from: Date | string = new Date()) {
  return Array.from({ length: count }, (_, i) =>
    shiftWeek(from, i - (count - 1)),
  );
}

/** "4 Aug 2026" — the label used wherever a week is shown to a user. */
export function formatWeek(date: Date | string): string {
  const start = toWeekStart(date);
  return start.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** True once the week containing `date` has finished — used for "late" reports. */
export function isWeekOver(date: Date | string, now: Date = new Date()): boolean {
  const end = shiftWeek(date, 1);
  return now.getTime() >= end.getTime();
}
