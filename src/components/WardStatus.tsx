import { CircleCheck, CircleHelp, CircleX } from 'lucide-react';
import type { WardStatus } from '../state/app';

const META: Record<WardStatus, { label: string; Icon: typeof CircleCheck; block: string; pill: string; dot: string }> = {
  open: {
    label: 'সিট আছে',
    Icon: CircleCheck,
    block: 'border-ok-100 bg-ok-50 text-ok-700',
    pill: 'bg-ok-50 text-ok-700',
    dot: 'bg-ok-600',
  },
  full: {
    label: 'সিট নেই',
    Icon: CircleX,
    block: 'border-bad-100 bg-bad-50 text-bad-700',
    pill: 'bg-bad-50 text-bad-700',
    dot: 'bg-bad-600',
  },
  unknown: {
    label: 'খবর নেই',
    Icon: CircleHelp,
    block: 'border-line bg-page text-ink-500',
    pill: 'bg-page text-ink-500',
    dot: 'bg-ink-400',
  },
};

export function StatusBlock({ status }: { status: WardStatus }) {
  const { label, Icon, block } = META[status];
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 ${block}`}>
      <Icon size={34} strokeWidth={2.2} />
      <span className="text-[26px] leading-none font-semibold">{label}</span>
    </div>
  );
}

export function StatusPill({ status }: { status: WardStatus }) {
  const { label, pill, dot } = META[status];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[14px] font-medium ${pill}`}>
      <span className={`size-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
