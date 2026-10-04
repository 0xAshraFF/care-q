import { CircleAlert, CircleCheck, CircleHelp, CircleX } from 'lucide-react';
import { toBnDigits } from '../lib/bn';
import type { WardStatus } from '../state/app';

export const STATUS_META: Record<
  WardStatus,
  { label: string; hint: string; dot: string; Icon: typeof CircleCheck; block: string; pill: string; dotClass: string; stripe: string }
> = {
  open: {
    label: 'সিট আছে',
    hint: 'সাধারণ ও জরুরি রোগী ভর্তি হচ্ছে',
    dot: '🟢',
    Icon: CircleCheck,
    block: 'border-ok-100 bg-ok-50 text-ok-700',
    pill: 'bg-ok-50 text-ok-700',
    dotClass: 'bg-ok-600',
    stripe: 'border-l-ok-600',
  },
  emergency: {
    label: 'শুধু ইমার্জেন্সি',
    hint: 'শুধু জরুরি রোগী নেওয়া হচ্ছে',
    dot: '🟡',
    Icon: CircleAlert,
    block: 'border-warn-100 bg-warn-50 text-warn-700',
    pill: 'bg-warn-50 text-warn-700',
    dotClass: 'bg-warn-500',
    stripe: 'border-l-warn-500',
  },
  full: {
    label: 'সিট নেই',
    hint: 'নতুন রোগী নেওয়া যাচ্ছে না',
    dot: '🔴',
    Icon: CircleX,
    block: 'border-bad-100 bg-bad-50 text-bad-700',
    pill: 'bg-bad-50 text-bad-700',
    dotClass: 'bg-bad-600',
    stripe: 'border-l-bad-600',
  },
  unknown: {
    label: 'খবর নেই',
    hint: 'এই ওয়ার্ডের খবর এখনো কোনো ডাক্তার দেননি',
    dot: '⚪',
    Icon: CircleHelp,
    block: 'border-line bg-page text-ink-500',
    pill: 'bg-page text-ink-500',
    dotClass: 'bg-ink-400',
    stripe: 'border-l-ink-400',
  },
};

/** Free-bed choices offered to doctors. 11 stands for "more than 10". */
export const BED_CHOICES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

/** "৩ বেড খালি", "১০+ বেড খালি" */
export function bedsText(n: number): string {
  return `${n > 10 ? '১০+' : toBnDigits(n)} বেড খালি`;
}

export function StatusBlock({ status }: { status: WardStatus }) {
  const { label, hint, Icon, block } = STATUS_META[status];
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${block}`}>
      <Icon size={32} strokeWidth={2.2} className="shrink-0" />
      <div className="min-w-0">
        <p className="text-[22px] leading-tight font-semibold">{label}</p>
        <p className="text-[14px] leading-snug opacity-90">{hint}</p>
      </div>
    </div>
  );
}

export function StatusPill({ status }: { status: WardStatus }) {
  const { label, pill, dotClass } = STATUS_META[status];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[14px] font-medium ${pill}`}>
      <span className={`size-2 rounded-full ${dotClass}`} />
      {label}
    </span>
  );
}
