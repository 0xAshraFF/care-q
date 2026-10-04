import { ExternalLink, Info, Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { NATIONAL, type Contact, type MarketRate } from '../data/directory';
import { formatPhone, telHref, toBnDigits } from '../lib/bn';
import { CallCircle } from './ui';

function mapsHref(q: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function ContactRow({ c }: { c: Contact }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <a href={telHref(c.phone)} className="block active:opacity-70">
          <p className="leading-snug font-semibold text-ink-900">{c.name}</p>
          {c.note && <p className="text-[14px] leading-snug text-ink-500">{c.note}</p>}
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[15px] text-brand-700 tabular-nums">
            {formatPhone(c.phone)}
            {!c.verified && (
              <span className="rounded-md bg-warn-50 px-1.5 text-[12px] font-medium text-warn-700">যাচাই বাকি</span>
            )}
          </p>
        </a>
        {c.price && <p className="mt-1 text-[14px] font-medium text-ink-700">{c.price}</p>}
        {(c.rating || c.mapsQuery) && (
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px]">
            {c.rating && (
              <span className="inline-flex items-center gap-1 font-medium text-ink-700">
                <Star size={15} className="fill-warn-500 text-warn-500" />
                {toBnDigits(c.rating.stars.toFixed(1))}
                <span className="font-normal text-ink-500">({toBnDigits(c.rating.reviews)} রিভিউ, Google)</span>
              </span>
            )}
            {c.mapsQuery && (
              <a
                href={mapsHref(c.mapsQuery)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-brand-700 underline"
              >
                Google-এ রিভিউ দেখুন <ExternalLink size={13} />
              </a>
            )}
          </p>
        )}
      </div>
      <a href={telHref(c.phone)} aria-label={`${c.name}-এ ফোন করুন`}>
        <CallCircle />
      </a>
    </li>
  );
}

export function ContactList({ contacts, tip }: { contacts: Contact[]; tip?: string }) {
  return (
    <div className="space-y-3">
      <ul className="card divide-y divide-line overflow-hidden p-0">
        {[...contacts, ...NATIONAL].map((c) => (
          <ContactRow key={c.phone} c={c} />
        ))}
      </ul>
      {tip && <p className="px-1 text-[15px] text-ink-500">{tip}</p>}
    </div>
  );
}

/** Roughly what it costs, across providers. Never a single provider's quote. */
export function RateNote({ rate }: { rate: MarketRate }) {
  return (
    <section className="card space-y-1.5 border-brand-200 bg-brand-50">
      <p className="font-semibold text-ink-900">আনুমানিক খরচ</p>
      <ul className="space-y-1 text-[15px] text-ink-700">
        {rate.lines.map((l) => (
          <li key={l}>• {l}</li>
        ))}
      </ul>
      <p className="text-[13px] text-ink-500">সূত্র: {rate.source}। দাম বদলায়, ফোনে জেনে নিন।</p>
    </section>
  );
}

/** "জেনে রাখুন": short, well-established practical points. */
export function InfoCard({ title, items, footnote }: { title: string; items: ReactNode[]; footnote?: string }) {
  return (
    <section className="card space-y-2">
      <p className="flex items-center gap-2 font-semibold">
        <Info size={19} className="text-brand-600" /> {title}
      </p>
      <ul className="space-y-1.5 text-[15px] leading-snug text-ink-700">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-400" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
      {footnote && <p className="text-[13px] text-ink-500">{footnote}</p>}
    </section>
  );
}
