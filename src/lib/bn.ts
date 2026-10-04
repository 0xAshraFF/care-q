// Bengali formatting helpers: digits, phone numbers, times.

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

export function toBnDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

export function toEnDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

/** Strip everything but digits (Bengali digits accepted), drop +88 / 88 country prefix. */
export function normalizeBdMobile(input: string): string {
  let digits = toEnDigits(input).replace(/\D/g, '');
  if (digits.startsWith('88') && digits.length === 13) digits = digits.slice(2);
  return digits;
}

export function isValidBdMobile(input: string): boolean {
  return /^01[3-9]\d{8}$/.test(normalizeBdMobile(input));
}

/** "01712345678" → "01712-345678", "0255165001" → "02-55165001", short codes unchanged. */
export function formatPhone(phone: string): string {
  if (/^01\d{9}$/.test(phone)) return `${phone.slice(0, 5)}-${phone.slice(5)}`;
  if (/^02\d{8}$/.test(phone)) return `02-${phone.slice(2)}`;
  return phone;
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** "এইমাত্র", "১৫ মিনিট আগে", "৩ ঘণ্টা আগে", "২ দিন আগে" */
export function timeAgo(then: number, now: number): string {
  const diff = Math.max(0, now - then);
  if (diff < MINUTE) return 'এইমাত্র';
  if (diff < HOUR) return `${toBnDigits(Math.floor(diff / MINUTE))} মিনিট আগে`;
  if (diff < 24 * HOUR) return `${toBnDigits(Math.floor(diff / HOUR))} ঘণ্টা আগে`;
  return `${toBnDigits(Math.floor(diff / (24 * HOUR)))} দিন আগে`;
}

/** "৫ ঘণ্টা ২০ মিনিট", "৪০ মিনিট" */
export function duration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / MINUTE));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${toBnDigits(m)} মিনিট`;
  if (m === 0) return `${toBnDigits(h)} ঘণ্টা`;
  return `${toBnDigits(h)} ঘণ্টা ${toBnDigits(m)} মিনিট`;
}

function dayPeriod(hour: number): string {
  if (hour >= 4 && hour < 12) return 'সকাল';
  if (hour >= 12 && hour < 15) return 'দুপুর';
  if (hour >= 15 && hour < 18) return 'বিকাল';
  if (hour >= 18 && hour < 20) return 'সন্ধ্যা';
  return 'রাত';
}

/** "রাত ৮টা", "সকাল ৭:৩০" */
export function clockTime(ts: number): string {
  const d = new Date(ts);
  const h24 = d.getHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const m = d.getMinutes();
  const time = m === 0 ? `${toBnDigits(h12)}টা` : `${toBnDigits(h12)}:${toBnDigits(String(m).padStart(2, '0'))}`;
  return `${dayPeriod(h24)} ${time}`;
}

/** Like clockTime, but prefixes "আগামীকাল" when ts falls on the next calendar day. */
export function clockTimeWithDay(ts: number, now: number): string {
  const a = new Date(now);
  const b = new Date(ts);
  const sameDay = a.toDateString() === b.toDateString();
  return sameDay ? clockTime(ts) : `আগামীকাল ${clockTime(ts)}`;
}
