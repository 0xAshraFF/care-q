import type { Contact } from '../data/directory';
import { NATIONAL } from '../data/directory';
import { formatPhone, telHref } from '../lib/bn';
import { CallCircle } from './ui';

function ContactRow({ c }: { c: Contact }) {
  return (
    <li>
      <a href={telHref(c.phone)} className="flex items-center gap-3 px-4 py-3.5 active:bg-brand-50">
        <div className="min-w-0 flex-1">
          <p className="leading-snug font-semibold text-ink-900">{c.name}</p>
          {c.note && <p className="text-[14px] leading-snug text-ink-500">{c.note}</p>}
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[15px] text-brand-700 tabular-nums">
            {formatPhone(c.phone)}
            {!c.verified && (
              <span className="rounded-md bg-warn-50 px-1.5 text-[12px] font-medium text-warn-700">যাচাই বাকি</span>
            )}
          </p>
        </div>
        <CallCircle />
      </a>
    </li>
  );
}

export function ContactList({ contacts, tip }: { contacts: Contact[]; tip?: string }) {
  return (
    <div className="space-y-4">
      <ul className="card divide-y divide-line overflow-hidden p-0">
        {contacts.map((c) => (
          <ContactRow key={c.phone} c={c} />
        ))}
      </ul>
      {tip && <p className="px-1 text-[15px] text-ink-500">{tip}</p>}
      <div>
        <h2 className="mb-2 px-1 text-[15px] font-medium text-ink-500">জাতীয় নম্বর</h2>
        <ul className="card divide-y divide-line overflow-hidden p-0">
          {NATIONAL.map((c) => (
            <ContactRow key={c.phone} c={c} />
          ))}
        </ul>
      </div>
    </div>
  );
}
