import { describe, expect, it } from 'vitest';
import {
  clockTime,
  clockTimeWithDay,
  duration,
  formatPhone,
  isValidBdMobile,
  normalizeBdMobile,
  timeAgo,
  toBnDigits,
  toEnDigits,
} from '../src/lib/bn';

const at = (h: number, m = 0, day = 4) => new Date(2026, 9, day, h, m).getTime();

describe('digits', () => {
  it('converts both ways', () => {
    expect(toBnDigits('O+ 12')).toBe('O+ ১২');
    expect(toEnDigits('০১৭১২৩৪৫৬৭৮')).toBe('01712345678');
  });
});

describe('phone', () => {
  it('accepts Bengali digits, spaces, dashes and +88', () => {
    expect(normalizeBdMobile('০১৭১২-৩৪৫ ৬৭৮')).toBe('01712345678');
    expect(normalizeBdMobile('+8801712345678')).toBe('01712345678');
    expect(isValidBdMobile('+88 01712 345678')).toBe(true);
  });
  it('rejects wrong lengths and operators', () => {
    expect(isValidBdMobile('0171234567')).toBe(false);
    expect(isValidBdMobile('01212345678')).toBe(false);
    expect(isValidBdMobile('')).toBe(false);
  });
  it('formats for display', () => {
    expect(formatPhone('01712345678')).toBe('01712-345678');
    expect(formatPhone('0255165001')).toBe('02-55165001');
    expect(formatPhone('999')).toBe('999');
  });
});

describe('time', () => {
  it('says how long ago', () => {
    const now = at(12);
    expect(timeAgo(now - 20_000, now)).toBe('এইমাত্র');
    expect(timeAgo(now - 15 * 60_000, now)).toBe('১৫ মিনিট আগে');
    expect(timeAgo(now - 3 * 3600_000, now)).toBe('৩ ঘণ্টা আগে');
    expect(timeAgo(now - 50 * 3600_000, now)).toBe('২ দিন আগে');
  });
  it('formats durations', () => {
    expect(duration(40 * 60_000)).toBe('৪০ মিনিট');
    expect(duration(6 * 3600_000)).toBe('৬ ঘণ্টা');
    expect(duration(5 * 3600_000 + 20 * 60_000)).toBe('৫ ঘণ্টা ২০ মিনিট');
  });
  it('uses everyday Bengali day periods', () => {
    expect(clockTime(at(8))).toBe('সকাল ৮টা');
    expect(clockTime(at(14))).toBe('দুপুর ২টা');
    expect(clockTime(at(16, 30))).toBe('বিকাল ৪:৩০');
    expect(clockTime(at(19, 5))).toBe('সন্ধ্যা ৭:০৫');
    expect(clockTime(at(20))).toBe('রাত ৮টা');
    expect(clockTime(at(0))).toBe('রাত ১২টা');
  });
  it('marks tomorrow', () => {
    expect(clockTimeWithDay(at(8, 0, 5), at(21))).toBe('আগামীকাল সকাল ৮টা');
    expect(clockTimeWithDay(at(14), at(9))).toBe('দুপুর ২টা');
  });
});
