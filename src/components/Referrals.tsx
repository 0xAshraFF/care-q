import { ArrowRightLeft, Send } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DoctorProfile, Transfer, WardState } from '../backend/types';
import { DEFAULT_HOSPITAL } from '../data/hospitals';
import { formatPhone, telHref, timeAgo } from '../lib/bn';
import { notify } from '../lib/notify';
import { STALE_AFTER_MS, useApp, useIncomingTransfers, useOnDutyDoctors, useSentTransfers, useWards, type WardView } from '../state/app';
import { Sheet } from './Sheet';
import { CallCircle, Field, Notice } from './ui';
import { STATUS_META, StatusPill, bedsText } from './WardStatus';

function useWardNames(hospitalId: string) {
  const { wards } = useWards(hospitalId);
  return useMemo(() => new Map(wards.map((w) => [w.id, w])), [wards]);
}

function DoctorCallRow({ name, phone, note }: { name: string; phone: string; note?: string }) {
  return (
    <a href={telHref(phone)} className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-2.5 active:bg-brand-50">
      <div className="min-w-0 flex-1">
        <p className="leading-snug font-semibold">{name}</p>
        <p className="text-[14px] text-brand-700 tabular-nums">
          {formatPhone(phone)}
          {note && <span className="text-ink-500"> · {note}</span>}
        </p>
      </div>
      <CallCircle />
    </a>
  );
}

export const AGE_GROUPS = [
  'নবজাতক (১ মাসের কম)',
  '১ বছরের কম',
  '১–৫ বছর',
  '৬–১২ বছর',
  '১৩–১৭ বছর',
  '১৮–৩০ বছর',
  '৩১–৪৫ বছর',
  '৪৬–৬০ বছর',
  '৬১–৭৫ বছর',
  '৭৫ বছরের বেশি',
];
export const SEXES = ['পুরুষ', 'মহিলা', 'অন্যান্য'];

/** Common reasons, so a busy doctor taps instead of typing. */
export const REFER_REASONS = [
  'বুকে ব্যথা / হার্ট',
  'শ্বাসকষ্ট',
  'স্ট্রোক / অজ্ঞান',
  'খিঁচুনি',
  'দুর্ঘটনা / আঘাত',
  'পোড়া',
  'রক্তক্ষরণ',
  'পেটের সমস্যা',
  'কিডনি',
  'প্রসূতি',
  'অপারেশন দরকার',
  'আইসিইউ সাপোর্ট দরকার',
];
export const URGENCY = ['খুব জরুরি', 'জরুরি', 'সাধারণ'] as const;

/** "খুব জরুরি · শ্বাসকষ্ট, স্ট্রোক / অজ্ঞান · ইসিজিতে পরিবর্তন" */
export function referralNote(urgency: string, reasons: string[], extra: string): string {
  return [urgency, reasons.join(', '), extra.trim()].filter(Boolean).join(' · ').slice(0, 300);
}

/** Pick a ward (already picked when opened from a ward card), tap a few options, send. */
export function ReferSheet({
  open,
  onClose,
  initialWardId,
}: {
  open: boolean;
  onClose: () => void;
  initialWardId?: string;
}) {
  const { backend, profile, now, toast } = useApp();
  const { wards } = useWards(profile?.hospitalId ?? DEFAULT_HOSPITAL.id);
  const onDuty = useOnDutyDoctors();
  const [toWardId, setToWardId] = useState('');
  const [reasons, setReasons] = useState<string[]>([]);
  const [urgency, setUrgency] = useState<string>('জরুরি');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [extra, setExtra] = useState('');
  const [showExtra, setShowExtra] = useState(false);

  useEffect(() => {
    if (open) setToWardId(initialWardId && initialWardId !== profile?.wardId ? initialWardId : '');
  }, [open, initialWardId, profile?.wardId]);

  if (!profile) return null;
  const myWard = wards.find((w) => w.id === profile.wardId);
  const target = wards.find((w) => w.id === toWardId);
  const targetDoctors = target ? onDuty.filter((d) => d.wardId === target.id) : [];
  const full = target?.status === 'full';

  const missing = !target
    ? 'কোন ওয়ার্ডে পাঠাবেন, বেছে নিন।'
    : reasons.length === 0 && extra.trim().length < 2
      ? 'কেন পাঠাচ্ছেন, অন্তত একটা বেছে নিন।'
      : null;

  const toggleReason = (r: string) =>
    setReasons((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));

  const reset = () => {
    setReasons([]);
    setUrgency('জরুরি');
    setAge('');
    setSex('');
    setExtra('');
    setShowExtra(false);
  };

  const send = () => {
    if (!backend || !target || missing) return;
    // Don't wait for the server: on a bad connection Firestore queues the write and sends it later.
    backend
      .createTransfer(profile, {
        toWardId: target.id,
        patientNote: referralNote(urgency, reasons, extra),
        patientInfo: [age, sex].filter(Boolean).join(', '),
      })
      .catch(() => toast('অনুরোধ যায়নি। আবার চেষ্টা করুন।'));
    toast('অনুরোধ গেছে। উত্তর এলে "আমার" পাতায় দেখাবে।');
    reset();
    onClose();
  };

  const optionLabel = (w: WardView) =>
    `${STATUS_META[w.status].dot} ${w.nameBn}${w.freeBeds ? ` · ${bedsText(w.freeBeds)}` : w.status === 'unknown' ? ' · খবর নেই' : ''}`;

  return (
    <Sheet open={open} onClose={onClose} title={`রেফার${myWard ? `: ${myWard.nameBn} থেকে` : ''}`}>
      <div className="space-y-2">
        <select
          id="refer-ward"
          aria-label="কোন ওয়ার্ডে পাঠাবেন"
          className="input"
          value={toWardId}
          onChange={(e) => setToWardId(e.target.value)}
        >
          <option value="">কোন ওয়ার্ডে পাঠাবেন?</option>
          {wards
            .filter((w) => w.id !== profile.wardId)
            .map((w) => (
              <option key={w.id} value={w.id}>
                {optionLabel(w)}
              </option>
            ))}
        </select>
        {target && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-ink-500">
            <StatusPill status={target.status} />
            {target.updatedAt !== undefined ? `আপডেট ${timeAgo(target.updatedAt, now)}` : 'এখনো কেউ জানায়নি'}
            {target.freeBeds ? <span className="font-medium text-ok-700">{bedsText(target.freeBeds)}</span> : null}
          </p>
        )}
        {target && target.updatedAt !== undefined && now - target.updatedAt > STALE_AFTER_MS && (
          <Notice tone="warn">খবরটা ৬ ঘণ্টার বেশি পুরনো। পাঠানোর আগে ফোন করে নিন।</Notice>
        )}
        {target &&
          (full ? (
            <Notice tone="warn">এই ওয়ার্ডে এখন সিট নেই। খুব জরুরি হলে পাঠাতে পারেন, ওই ওয়ার্ডের ডাক্তার সিদ্ধান্ত নেবেন।</Notice>
          ) : targetDoctors.length > 0 ? (
            targetDoctors.slice(0, 2).map((d) => <DoctorCallRow key={d.uid} name={d.name} phone={d.phone} note="ডিউটিতে" />)
          ) : (
            <Notice>এই ওয়ার্ডের কেউ এখন অ্যাপে ডিউটিতে নেই। কেউ অ্যাপ খুললে অনুরোধ দেখবেন।</Notice>
          ))}
      </div>

      {target && (
        <>
          <fieldset>
            <legend className="label">কেন পাঠাচ্ছেন</legend>
            <div className="flex flex-wrap gap-2">
              {REFER_REASONS.map((r) => (
                <button key={r} type="button" className="chip" aria-pressed={reasons.includes(r)} onClick={() => toggleReason(r)}>
                  {r}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="label">কতটা জরুরি</legend>
            <div className="grid grid-cols-3 gap-2">
              {URGENCY.map((u) => (
                <button key={u} type="button" className="chip px-2" aria-pressed={urgency === u} onClick={() => setUrgency(u)}>
                  {u}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-[3fr_2fr] gap-2">
            <select id="refer-age" aria-label="বয়স" className="input" value={age} onChange={(e) => setAge(e.target.value)}>
              <option value="">বয়স</option>
              {AGE_GROUPS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <select id="refer-sex" aria-label="লিঙ্গ" className="input" value={sex} onChange={(e) => setSex(e.target.value)}>
              <option value="">লিঙ্গ</option>
              {SEXES.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>
          {showExtra ? (
            <Field label="আরও কিছু (না দিলেও চলবে)" htmlFor="refer-extra">
              <input
                id="refer-extra"
                className="input"
                maxLength={120}
                placeholder="যেমন: ইসিজিতে পরিবর্তন"
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
              />
            </Field>
          ) : (
            <button type="button" className="text-[15px] font-medium text-brand-700 underline" onClick={() => setShowExtra(true)}>
              + আরও কিছু লিখতে চাইলে
            </button>
          )}
        </>
      )}

      <div className="sticky bottom-0 -mx-4 space-y-2 border-t border-line bg-white px-4 pt-3 pb-1">
        {missing && target && <p className="text-[15px] font-medium text-warn-700">{missing}</p>}
        <div className="grid grid-cols-[2fr_3fr] gap-2">
          <button type="button" className="btn btn-soft" onClick={onClose}>
            বাতিল
          </button>
          <button type="button" className="btn btn-primary" disabled={missing !== null} onClick={send}>
            <Send size={19} /> পাঠান
          </button>
        </div>
      </div>
    </Sheet>
  );
}

/** Accept/decline, with "one fewer free bed" applied on accept when the ward has a count. */
function useRespond() {
  const { backend, profile, toast } = useApp();
  const { wards } = useWards(profile?.hospitalId ?? DEFAULT_HOSPITAL.id);
  return async (t: Transfer, accept: boolean) => {
    if (!backend || !profile) return;
    const mine = wards.find((w) => w.id === profile.wardId);
    let wardUpdate: { status: WardState; freeBeds: number | null } | undefined;
    if (accept && mine?.freeBeds && mine.status !== 'unknown' && mine.status !== 'full') {
      const left = mine.freeBeds > 10 ? 10 : mine.freeBeds - 1;
      wardUpdate = left > 0 ? { status: mine.status, freeBeds: left } : { status: 'full', freeBeds: null };
    }
    try {
      await backend.respondTransfer(profile, t.id, accept, wardUpdate);
      toast(accept ? 'গ্রহণ করেছেন। পাঠানো ডাক্তার জানতে পারবেন।' : 'জানানো হয়েছে: সিট নেই');
    } catch {
      toast('হয়নি। আবার চেষ্টা করুন।');
    }
  };
}

function IncomingCard({ t, onDone }: { t: Transfer; onDone?: () => void }) {
  const { now } = useApp();
  const names = useWardNames(t.hospitalId);
  const respond = useRespond();
  const [busy, setBusy] = useState(false);
  // The urgency chip is the first part of the note ("খুব জরুরি · শ্বাসকষ্ট"); show it as a badge.
  const urgency = URGENCY.find((u) => t.patientNote === u || t.patientNote.startsWith(`${u} · `));
  const note = urgency ? t.patientNote.slice(urgency.length).replace(/^ · /, '') : t.patientNote;
  const act = async (accept: boolean) => {
    setBusy(true);
    await respond(t, accept);
    setBusy(false);
    onDone?.();
  };
  return (
    <div className="space-y-3">
      <p className="text-[15px] text-ink-500">
        <span className="font-semibold text-ink-900">{names.get(t.fromWardId)?.nameBn ?? 'অন্য ওয়ার্ড'}</span> থেকে ·{' '}
        {timeAgo(t.createdAt, now)}
      </p>
      <div className="rounded-xl bg-page px-3.5 py-3">
        {urgency && (
          <span
            className={`mb-1.5 inline-block rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${
              urgency === 'খুব জরুরি' ? 'bg-bad-600 text-white' : urgency === 'জরুরি' ? 'bg-warn-50 text-warn-700' : 'bg-white text-ink-500'
            }`}
          >
            {urgency}
          </span>
        )}
        <p className="text-[17px] leading-snug">{note}</p>
        {t.patientInfo && <p className="mt-1 text-[15px] text-ink-500">{t.patientInfo}</p>}
      </div>
      <DoctorCallRow name={t.fromDoctorName} phone={t.fromDoctorPhone} note="যিনি পাঠিয়েছেন" />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void act(false)}
          className="btn border border-bad-100 bg-white text-bad-700 active:bg-bad-50"
        >
          সিট নেই
        </button>
        <button type="button" disabled={busy} onClick={() => void act(true)} className="btn bg-ok-600 text-white active:bg-ok-700">
          গ্রহণ করুন
        </button>
      </div>
    </div>
  );
}

/** Pops up over any tab when a referral arrives for the doctor's ward. */
export function IncomingPopup() {
  const incoming = useIncomingTransfers();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const shown = incoming.find((t) => !dismissed.includes(t.id));
  const buzzed = useRef<Set<string>>(new Set());

  const names = useWardNames(shown?.hospitalId ?? DEFAULT_HOSPITAL.id);

  useEffect(() => {
    if (!shown || buzzed.current.has(shown.id)) return;
    buzzed.current.add(shown.id);
    try {
      navigator.vibrate?.([250, 120, 250]);
    } catch {
      // Not supported, or not allowed before the user has touched the page.
    }
    // The popup covers the visible case; a system notification reaches a doctor who switched apps.
    if (document.visibilityState !== 'visible') {
      const from = names.get(shown.fromWardId)?.nameBn ?? 'অন্য ওয়ার্ড';
      void notify('নতুন রেফার অনুরোধ', `${from} থেকে: ${shown.patientNote}`, shown.id);
    }
  }, [shown, names]);

  if (!shown) return null;
  const close = () => setDismissed((d) => [...d, shown.id]);
  return (
    <Sheet open onClose={close} title="নতুন রেফার অনুরোধ">
      <IncomingCard t={shown} onDone={close} />
      <button type="button" className="btn btn-ghost w-full" onClick={close}>
        পরে দেখব
      </button>
    </Sheet>
  );
}

export function IncomingList() {
  const incoming = useIncomingTransfers();
  if (incoming.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 px-1 text-[19px] font-semibold">
        <ArrowRightLeft size={21} className="text-brand-600" /> আপনার ওয়ার্ডে আসা অনুরোধ
      </h2>
      {incoming.map((t) => (
        <div key={t.id} className="card border-warn-100">
          <IncomingCard t={t} />
        </div>
      ))}
    </section>
  );
}

const SENT_META: Record<Transfer['status'], { label: string; cls: string }> = {
  pending: { label: 'উত্তরের অপেক্ষায়', cls: 'bg-warn-50 text-warn-700' },
  accepted: { label: 'গ্রহণ করেছেন', cls: 'bg-ok-50 text-ok-700' },
  rejected: { label: 'সিট নেই বলেছেন', cls: 'bg-bad-50 text-bad-700' },
  cancelled: { label: 'বাতিল করেছেন', cls: 'bg-page text-ink-500' },
};

function SentCard({ t, onDuty }: { t: Transfer; onDuty: DoctorProfile[] }) {
  const { backend, user, now, toast } = useApp();
  const names = useWardNames(t.hospitalId);
  const meta = SENT_META[t.status];
  const targetDoctors = onDuty.filter((d) => d.wardId === t.toWardId).slice(0, 2);
  return (
    <li className="card space-y-2.5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="leading-snug font-semibold">{names.get(t.toWardId)?.nameBn ?? 'ওয়ার্ড'}</p>
          <p className="truncate text-[14px] text-ink-500">
            {timeAgo(t.createdAt, now)} · {t.patientNote}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[13px] font-medium ${meta.cls}`}>{meta.label}</span>
      </div>
      {(t.status === 'accepted' || t.status === 'rejected') && t.respondedByName && t.respondedByPhone && (
        <DoctorCallRow name={t.respondedByName} phone={t.respondedByPhone} />
      )}
      {t.status === 'accepted' && <Notice>রোগী পাঠাতে পারেন। স্বজনদের বলুন সরাসরি এই ওয়ার্ডে যেতে।</Notice>}
      {t.status === 'pending' && (
        <>
          {targetDoctors.map((d) => (
            <DoctorCallRow key={d.uid} name={d.name} phone={d.phone} note="ডিউটিতে" />
          ))}
          <button
            type="button"
            className="text-[14px] font-medium text-ink-500 underline"
            onClick={() =>
              backend && user && backend.cancelTransfer(user.uid, t.id).catch(() => toast('হয়নি। আবার চেষ্টা করুন।'))
            }
          >
            অনুরোধ বাতিল করুন
          </button>
        </>
      )}
    </li>
  );
}

export function SentList() {
  const sent = useSentTransfers();
  const onDuty = useOnDutyDoctors();
  if (sent.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="px-1 text-[17px] font-semibold">আজ যাদের রেফার করেছেন</h2>
      <ul className="space-y-2">
        {sent.map((t) => (
          <SentCard key={t.id} t={t} onDuty={onDuty} />
        ))}
      </ul>
    </section>
  );
}
