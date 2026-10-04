import { ChevronDown, ChevronRight, Clock, Search, Send } from 'lucide-react';
import { useState } from 'react';
import type { DoctorProfile, WardState } from '../backend/types';
import { ReferSheet } from '../components/Referrals';
import { CallButton, CallCircle, Notice } from '../components/ui';
import { STATUS_META, StatusPill, bedsText } from '../components/WardStatus';
import { DEFAULT_HOSPITAL, type Hospital } from '../data/hospitals';
import { clockTimeWithDay, formatPhone, telHref, timeAgo, toBnDigits, wardNameKey } from '../lib/bn';
import { isOnDuty, shiftEndChoices } from '../lib/duty';
import { askNotifyPermission } from '../lib/notify';
import { useStoredState } from '../lib/hooks';
import { STALE_AFTER_MS, useApp, useOnDutyDoctors, useWards, type WardStatus, type WardView } from '../state/app';

type Filter = Exclude<WardStatus, 'unknown'> | 'all';

function OnDutyDoctors({ ward, doctors }: { ward: WardView; doctors: DoctorProfile[] }) {
  if (ward.status === 'full') {
    return <Notice>সিট খালি হলে এখানে ডিউটির ডাক্তারের নম্বর দেখা যাবে।</Notice>;
  }
  if (doctors.length === 0) {
    return <Notice>এই মুহূর্তে এই ওয়ার্ডের কেউ অ্যাপে ডিউটিতে নেই।</Notice>;
  }
  return (
    <div className="space-y-2">
      <p className="label mb-0">এখন ডিউটিতে</p>
      {doctors.map((d) => (
        <a key={d.uid} href={telHref(d.phone)} className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-2.5 active:bg-brand-50">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{d.name}</p>
            <p className="text-[15px] text-brand-700 tabular-nums">{formatPhone(d.phone)}</p>
          </div>
          <CallCircle />
        </a>
      ))}
    </div>
  );
}

function WardCard({
  ward,
  hospital,
  open,
  onToggle,
  onRefer,
  doctorsHere,
}: {
  ward: WardView;
  hospital: Hospital;
  open: boolean;
  onToggle: () => void;
  onRefer: () => void;
  doctorsHere: DoctorProfile[];
}) {
  const { now, isDoctor, profile } = useApp();
  const meta = STATUS_META[ward.status];
  const stale = ward.updatedAt !== undefined && now - ward.updatedAt > STALE_AFTER_MS;
  const mine = profile?.wardId === ward.id;
  const canRefer = isDoctor && !mine;

  return (
    <li className={`card overflow-hidden border-l-4 p-0 ${meta.stripe}`}>
      <div className="flex items-center">
        <button type="button" onClick={onToggle} aria-expanded={open} className="min-w-0 flex-1 px-4 py-3 text-left active:bg-brand-50">
          <p className="flex items-center gap-1.5 text-[17px] leading-snug font-semibold">
            <span className="min-w-0">{ward.nameBn}</span>
            {mine && <span className="text-[13px] font-medium text-brand-700">(আপনার)</span>}
            <span className="ml-auto shrink-0 text-ink-400">{open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[14px] text-ink-500">
            <StatusPill status={ward.status} />
            {ward.freeBeds ? <span className="font-medium text-ok-700">{bedsText(ward.freeBeds)}</span> : null}
            {ward.updatedAt !== undefined && (
              <span className={`inline-flex items-center gap-1 ${stale ? 'font-medium text-warn-700' : ''}`}>
                <Clock size={14} /> {timeAgo(ward.updatedAt, now)}
              </span>
            )}
          </div>
        </button>
        {canRefer && (
          <button
            type="button"
            onClick={onRefer}
            className="mr-3 inline-flex min-h-12 shrink-0 flex-col items-center justify-center rounded-xl border border-brand-200 bg-brand-50 px-3 text-[14px] font-semibold text-brand-700 active:bg-brand-100"
          >
            <Send size={18} /> রেফার
          </button>
        )}
      </div>

      {open && (
        <div className="space-y-3 border-t border-line px-4 py-3">
          <p className="text-[15px] text-ink-700">{meta.hint}</p>
          {stale && <Notice tone="warn">খবরটা ৬ ঘণ্টার বেশি পুরনো। পাঠানোর আগে ফোন করে নিশ্চিত হোন।</Notice>}
          {isDoctor ? (
            <OnDutyDoctors ward={ward} doctors={doctorsHere} />
          ) : (
            <CallButton phone={hospital.phone} label="হাসপাতালে ফোন" />
          )}
        </div>
      )}
    </li>
  );
}

const QUICK: WardState[] = ['open', 'emergency', 'full'];
const QUICK_ACTIVE: Record<WardState, string> = {
  open: 'border-ok-600 bg-ok-600 text-white',
  emergency: 'border-warn-600 bg-warn-600 text-white',
  full: 'border-bad-600 bg-bad-600 text-white',
};

/** The doctor's own ward at the top of home: one tap to update it, one tap to start duty. */
function MyWardStrip() {
  const { backend, profile, now, toast, isDoctor } = useApp();
  const { wards } = useWards(profile?.hospitalId ?? DEFAULT_HOSPITAL.id);
  if (!isDoctor || !profile || !backend) return null;
  const ward = wards.find((w) => w.id === profile.wardId);
  if (!ward) return null;
  const onDuty = isOnDuty(profile.dutyUntil, now);
  const defaultEnd = shiftEndChoices(now)[0];

  const setStatus = (s: WardState) =>
    backend
      .setWardStatus(profile.uid, profile.hospitalId, ward.id, s, s === 'full' ? null : ward.freeBeds)
      .then(() => toast(`জানানো হয়েছে: ${STATUS_META[s].label}`))
      .catch(() => toast('আপডেট হয়নি। আবার চেষ্টা করুন।'));

  const startDuty = () => {
    void askNotifyPermission();
    backend.setDuty(profile.uid, defaultEnd).catch(() => toast('হয়নি। আবার চেষ্টা করুন।'));
  };

  return (
    <section className="card space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[17px] leading-snug font-semibold">
          <span className="text-[14px] font-normal text-ink-500">আপনার ওয়ার্ড · </span>
          {ward.nameBn}
        </p>
        <p className="shrink-0 text-[13px] text-ink-500">
          {ward.updatedAt !== undefined ? timeAgo(ward.updatedAt, now) : 'আপডেট নেই'}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {QUICK.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={ward.status === s}
            onClick={() => void setStatus(s)}
            className={`min-h-12 rounded-xl border-2 px-1 text-[15px] leading-tight font-semibold ${
              ward.status === s ? QUICK_ACTIVE[s] : `${STATUS_META[s].block} bg-white`
            }`}
          >
            {s === 'emergency' ? 'ইমার্জেন্সি' : STATUS_META[s].label}
          </button>
        ))}
      </div>
      {onDuty ? (
        <p className="flex items-center gap-2 text-[14px] font-medium text-ok-700">
          <span className="size-2 rounded-full bg-ok-600" /> ডিউটিতে আছেন · {clockTimeWithDay(profile.dutyUntil!, now)} পর্যন্ত
        </p>
      ) : (
        defaultEnd !== undefined && (
          <button type="button" className="btn btn-soft min-h-11 w-full text-[15px]" onClick={startDuty}>
            ডিউটি শুরু · {clockTimeWithDay(defaultEnd, now)} পর্যন্ত
          </button>
        )
      )}
    </section>
  );
}

/** Home for doctors: their own ward up top, then every ward with a refer button. */
export function WardsPage() {
  const hospital = DEFAULT_HOSPITAL;
  const { wards, loaded, error } = useWards(hospital.id);
  const onDuty = useOnDutyDoctors();
  const [openId, setOpenId] = useStoredState<string>('careq-ward', '');
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [referTo, setReferTo] = useState<string | null>(null);

  const count = (s: WardStatus) => wards.filter((w) => w.status === s).length;
  const q = wardNameKey(search);
  const list = wards
    .filter((w) => (filter === 'all' || w.status === filter) && (q === '' || wardNameKey(w.nameBn).includes(q)))
    // Wards with news first; the rest keep alphabetical order after them.
    .sort((a, b) => Number(a.status === 'unknown') - Number(b.status === 'unknown'));

  const tile = (s: Exclude<WardStatus, 'unknown'>, label: string) => {
    const active = filter === s;
    const meta = STATUS_META[s];
    return (
      <button
        type="button"
        aria-pressed={active}
        onClick={() => setFilter(active ? 'all' : s)}
        className={`rounded-xl border-2 px-2 py-2 text-center transition-colors ${meta.block} ${active ? 'border-current' : ''}`}
      >
        <span className="block text-[22px] leading-none font-semibold tabular-nums">{toBnDigits(count(s))}</span>
        <span className="mt-1 block text-[13px] leading-tight font-medium">{label}</span>
      </button>
    );
  };

  return (
    <>
      <div className="space-y-3">
        <MyWardStrip />

        <section className="space-y-2">
          <h1 className="px-1 text-[20px] leading-tight font-semibold">কোথায় সিট আছে?</h1>
          <div className="grid grid-cols-3 gap-2">
            {tile('open', 'সিট আছে')}
            {tile('emergency', 'ইমার্জেন্সি')}
            {tile('full', 'সিট নেই')}
          </div>
          <div className="relative">
            <Search size={20} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-400" />
            <input
              id="ward-search"
              className="input pl-11"
              type="search"
              placeholder="ওয়ার্ড খুঁজুন"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </section>

        {error && <Notice tone="warn">তথ্য আনা যাচ্ছে না। ইন্টারনেট সংযোগ দেখুন।</Notice>}

        {!loaded && !error ? (
          <p className="card text-ink-500">লোড হচ্ছে…</p>
        ) : list.length === 0 ? (
          <p className="card text-ink-500">এমন কোনো ওয়ার্ড পাওয়া যায়নি।</p>
        ) : (
          <ul className="space-y-2">
            {list.map((w) => (
              <WardCard
                key={w.id}
                ward={w}
                hospital={hospital}
                open={openId === w.id}
                onToggle={() => setOpenId(openId === w.id ? '' : w.id)}
                onRefer={() => setReferTo(w.id)}
                doctorsHere={onDuty.filter((d) => d.wardId === w.id)}
              />
            ))}
          </ul>
        )}
      </div>

      <ReferSheet open={referTo !== null} onClose={() => setReferTo(null)} initialWardId={referTo ?? undefined} />
    </>
  );
}
