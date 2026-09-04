import { describe, expect, it } from 'vitest';
import { isWeekOver, shiftWeek, toWeekStart } from './week.js';

const iso = (d: Date) => d.toISOString();

describe('toWeekStart', () => {
  it('leaves a Monday untouched', () => {
    expect(iso(toWeekStart('2026-08-03T00:00:00.000Z'))).toBe(
      '2026-08-03T00:00:00.000Z',
    );
  });

  it('maps every day of a week to the same Monday', () => {
    const days = [
      '2026-08-03', // Mon
      '2026-08-04',
      '2026-08-05',
      '2026-08-06',
      '2026-08-07',
      '2026-08-08',
      '2026-08-09', // Sun — the off-by-one trap
    ];
    for (const day of days) {
      expect(iso(toWeekStart(day))).toBe('2026-08-03T00:00:00.000Z');
    }
  });

  it('sends Sunday back to the Monday that started its week, not forward', () => {
    expect(iso(toWeekStart('2026-08-09T23:59:59.000Z'))).toBe(
      '2026-08-03T00:00:00.000Z',
    );
  });

  it('strips the time component', () => {
    expect(iso(toWeekStart('2026-08-06T17:42:11.123Z'))).toBe(
      '2026-08-03T00:00:00.000Z',
    );
  });

  it('crosses month and year boundaries', () => {
    expect(iso(toWeekStart('2027-01-01'))).toBe('2026-12-28T00:00:00.000Z');
  });

  it('rejects an unparseable date', () => {
    expect(() => toWeekStart('not-a-date')).toThrow(RangeError);
  });
});

describe('shiftWeek', () => {
  it('moves whole weeks in both directions', () => {
    expect(iso(shiftWeek('2026-08-06', -1))).toBe('2026-07-27T00:00:00.000Z');
    expect(iso(shiftWeek('2026-08-06', 1))).toBe('2026-08-10T00:00:00.000Z');
    expect(iso(shiftWeek('2026-08-06', 0))).toBe('2026-08-03T00:00:00.000Z');
  });
});

describe('isWeekOver', () => {
  it('is false inside the week and true once the next Monday arrives', () => {
    expect(isWeekOver('2026-08-03', new Date('2026-08-09T23:00:00Z'))).toBe(
      false,
    );
    expect(isWeekOver('2026-08-03', new Date('2026-08-10T00:00:00Z'))).toBe(
      true,
    );
  });
});
