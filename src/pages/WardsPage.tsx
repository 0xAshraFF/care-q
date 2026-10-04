import { ChevronDown, ChevronRight, Clock, Search, Send } from 'lucide-react';
import { useState } from 'react';
import type { DoctorProfile } from '../backend/types';
import { ReferSheet } from '../components/Referrals';
import { CallButton, CallCircle, Notice, PageTitle } from '../components/ui';
import { STATUS_META, StatusPill, bedsText } from '../components/WardStatus';
import { DEFAULT_HOSPITAL, type Hospital } from '../data/hospitals';
import { formatPhone, telHref, timeAgo, toBnDigits, wardNameKey } from '../lib/bn';
import { useStoredState, type Route } from '../lib/hooks';
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

  const hasMeta = ward.updatedAt !== undefined || (isDoctor && doctorsHere.length > 0);
  const chevron = <span className="text-brand-600">{open ? <ChevronDown size={20} /> : <ChevronRight size={20} />}</span>;
  const title = (
    <>
      {ward.nameBn}
      {mine && <span className="ml-1.5 text-[13px] font-medium text-brand-700">(আপনার)</span>}
    </>
  );

  return (
    <li className={`card overflow-hidden border-l-4 p-0 ${meta.stripe}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full px-4 py-3 text-left active:bg-brand-50">
        {hasMeta ? (
          <>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[18px] leading-snug font-semibold">{title}</p>
                <p className="text-[14px] leading-snug text-ink-500">{meta.hint}</p>
              </div>
              <StatusPill status={ward.status} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-ink-500">
              {ward.updatedAt !== undefined && (
                <span className={`inline-flex items-center gap-1 ${stale ? 'font-medium text-warn-700' : ''}`}>
                  <Clock size={14} /> {timeAgo(ward.updatedAt, now)}
                </span>
              )}
              {ward.freeBeds ? <span className="font-medium text-ok-700">{bedsText(ward.freeBeds)}</span> : null}
              {isDoctor && ward.status !== 'full' && doctorsHere.length > 0 && (
                <span>ডিউটিতে {toBnDigits(doctorsHere.length)} জন</span>
              )}
              <span className="ml-auto">{chevron}</span>
            </div>
          </>
        ) : (
          // Nobody has reported on this ward yet: one compact row.
          <div className="flex items-center gap-3">
            <p className="min-w-0 flex-1 text-[17px] leading-snug font-semibold">{title}</p>
            <StatusPill status={ward.status} />
            {chevron}
          </div>
        )}
      </button>

      {open && (
        <div className="space-y-3 border-t border-line px-4 py-3">
          {stale && <Notice tone="warn">খবরটা ৬ ঘণ্টার বেশি পুরনো। রোগী নিয়ে যাওয়ার আগে ফোন করে নিশ্চিত হোন।</Notice>}
          {isDoctor ? (
            <>
              <OnDutyDoctors ward={ward} doctors={doctorsHere} />
              {!mine && (
                <button type="button" className="btn btn-primary w-full" onClick={onRefer}>
                  <Send size={19} /> এই ওয়ার্ডে রেফার করুন
                </button>
              )}
            </>
          ) : (
            <>
              <p className="text-[15px] text-ink-700">যাওয়ার আগে নিশ্চিত হতে হাসপাতালের তথ্যকেন্দ্রে ফোন করতে পারেন।</p>
              <CallButton phone={hospital.phone} label="হাসপাতালে ফোন" />
            </>
          )}
        </div>
      )}
    </li>
  );
}

export function WardsPage({ go }: { go: (r: Route) => void }) {
  const { user } = useApp();
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
        className={`rounded-xl border-2 px-2 py-2.5 text-center transition-colors ${meta.block} ${
          active ? 'border-current' : ''
        }`}
      >
        <span className="block text-[24px] leading-none font-semibold tabular-nums">{toBnDigits(count(s))}</span>
        <span className="mt-1 block text-[14px] leading-tight font-medium">{label}</span>
      </button>
    );
  };

  return (
    <>
      <PageTitle title="কোন ওয়ার্ডে সিট আছে?" subtitle="রোগী নিয়ে যাওয়ার আগে দেখে নিন।" />

      <section className="card space-y-3">
        <p className="font-semibold">{hospital.nameBn}</p>
        <div className="grid grid-cols-3 gap-2">
          {tile('open', 'সিট আছে')}
          {tile('emergency', 'ইমার্জেন্সি')}
          {tile('full', 'সিট নেই')}
        </div>
        <p className="text-[14px] text-ink-500">
          {filter === 'all'
            ? `ঘরে চাপ দিলে শুধু সেই ওয়ার্ডগুলো দেখাবে। খবর নেই: ${toBnDigits(count('unknown'))}টি।`
            : 'আবার চাপ দিলে সব ওয়ার্ড দেখাবে।'}
        </p>
      </section>

      <div className="relative mt-3">
        <Search size={20} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-400" />
        <input
          id="ward-search"
          className="input pl-11"
          type="search"
          placeholder="ওয়ার্ড খুঁজুন, যেমন: মেডিসিন"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="mt-3">
          <Notice tone="warn">তথ্য আনা যাচ্ছে না। ইন্টারনেট সংযোগ দেখুন।</Notice>
        </div>
      )}

      {!loaded && !error ? (
        <p className="card mt-3 text-ink-500">লোড হচ্ছে…</p>
      ) : list.length === 0 ? (
        <p className="card mt-3 text-ink-500">এমন কোনো ওয়ার্ড পাওয়া যায়নি।</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
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

      {!user && (
        <button
          type="button"
          onClick={() => go('doctor')}
          className="mt-6 flex w-full items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3.5 text-left"
        >
          <span className="flex-1">
            <span className="block font-semibold text-brand-700">আপনি কি ডাক্তার?</span>
            <span className="block text-[14px] text-ink-500">লগইন করলে ডিউটির ডাক্তারদের নম্বর দেখবেন, রেফার করতে পারবেন</span>
          </span>
          <ChevronRight className="text-brand-600" />
        </button>
      )}

      <ReferSheet open={referTo !== null} onClose={() => setReferTo(null)} initialWardId={referTo ?? undefined} />
    </>
  );
}
