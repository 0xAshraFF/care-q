import { Phone } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatPhone, telHref } from '../lib/bn';

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h1 className="text-[22px] leading-tight font-semibold text-ink-900">{title}</h1>
      {subtitle && <p className="mt-1 text-[15px] text-ink-500">{subtitle}</p>}
    </div>
  );
}

export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  label,
  render = String,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  render?: (v: T) => string;
}) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={String(o)} type="button" className="chip" aria-pressed={o === value} onClick={() => onChange(o)}>
            {render(o)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[14px] text-ink-500">{hint}</p>}
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="tablist" className="mb-4 grid grid-flow-col gap-1 rounded-xl bg-brand-100 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          type="button"
          aria-selected={o.id === value}
          onClick={() => onChange(o.id)}
          className={`min-h-11 rounded-lg text-[16px] font-semibold transition-colors ${
            o.id === value ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Round call button; whole parent row is usually the tel: link. */
export function CallCircle() {
  return (
    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-600 text-white" aria-hidden>
      <Phone size={22} strokeWidth={2.2} />
    </span>
  );
}

export function CallButton({ phone, label }: { phone: string; label: string }) {
  return (
    <a href={telHref(phone)} className="btn btn-soft w-full">
      <Phone size={20} />
      {label}
      <span className="font-normal text-ink-500">{formatPhone(phone)}</span>
    </a>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn'; children: ReactNode }) {
  const cls = tone === 'warn' ? 'bg-warn-50 text-warn-700' : 'bg-brand-50 text-ink-700';
  return <p className={`rounded-xl px-3.5 py-2.5 text-[15px] ${cls}`}>{children}</p>;
}
