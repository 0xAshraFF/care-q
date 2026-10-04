// Shift end-time helpers. Government hospital shifts usually end at 8am, 2pm or 8pm.

export const COMMON_SHIFT_ENDS = [8, 14, 20] as const;

/** Next occurrence (strictly in the future) of hour:minute local time. */
export function nextOccurrence(hour: number, minute: number, now: number): number {
  const d = new Date(now);
  d.setHours(hour, minute, 0, 0);
  if (d.getTime() <= now) d.setDate(d.getDate() + 1);
  return d.getTime();
}

/** Shift-end choices sorted by how soon they come. Ends less than an hour away are skipped
 * (a doctor arriving at 7:30pm is starting the night shift, not ending the evening one), and so
 * are ends more than 13h away; longer duties use the "other time" input. */
export function shiftEndChoices(now: number): number[] {
  return COMMON_SHIFT_ENDS.map((h) => nextOccurrence(h, 0, now))
    .filter((t) => t - now >= 60 * 60_000 && t - now <= 13 * 60 * 60_000)
    .sort((a, b) => a - b);
}

/** Parse "HH:MM" from <input type="time"> into the next occurrence. */
export function endFromTimeInput(value: string, now: number): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return nextOccurrence(h, min, now);
}

export function isOnDuty(dutyUntil: number | null | undefined, now: number): boolean {
  return typeof dutyUntil === 'number' && dutyUntil > now;
}
