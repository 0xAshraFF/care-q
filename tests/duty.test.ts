import { describe, expect, it } from 'vitest';
import { endFromTimeInput, isOnDuty, nextOccurrence, shiftEndChoices } from '../src/lib/duty';

const at = (h: number, m = 0, day = 4) => new Date(2026, 9, day, h, m).getTime();

describe('shift end choices', () => {
  it('suggests the end of the shift a doctor is starting', () => {
    // Arriving for the morning shift: 2pm first.
    expect(shiftEndChoices(at(7, 55))[0]).toBe(at(14));
    // Arriving 30 min before the night shift: 8am tomorrow, not 8pm today.
    expect(shiftEndChoices(at(19, 30))[0]).toBe(at(8, 0, 5));
    // Arriving late for the evening shift: still 8pm.
    expect(shiftEndChoices(at(14, 40))[0]).toBe(at(20));
  });
  it('only offers ends between 1h and 13h away', () => {
    for (let h = 0; h < 24; h++) {
      const now = at(h, 17);
      const choices = shiftEndChoices(now);
      expect(choices.length).toBeGreaterThan(0);
      for (const t of choices) {
        expect(t - now).toBeGreaterThanOrEqual(3600_000);
        expect(t - now).toBeLessThanOrEqual(13 * 3600_000);
      }
    }
  });
});

describe('time input', () => {
  it('rolls over to tomorrow when the time has passed', () => {
    expect(endFromTimeInput('09:00', at(10))).toBe(at(9, 0, 5));
    expect(endFromTimeInput('22:15', at(10))).toBe(at(22, 15));
    expect(endFromTimeInput('', at(10))).toBeNull();
    expect(endFromTimeInput('25:00', at(10))).toBeNull();
  });
  it('treats "now" as tomorrow (24h duty)', () => {
    expect(nextOccurrence(10, 0, at(10))).toBe(at(10, 0, 5));
  });
});

describe('isOnDuty', () => {
  it('is false for null or past', () => {
    expect(isOnDuty(null, at(10))).toBe(false);
    expect(isOnDuty(at(9), at(10))).toBe(false);
    expect(isOnDuty(at(11), at(10))).toBe(true);
  });
});
