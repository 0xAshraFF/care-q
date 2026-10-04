import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { DoctorProfile } from '../backend/types';
import { CallButton, CallCircle, Field, Notice, PageTitle } from '../components/ui';
import { StatusBlock, StatusPill } from '../components/WardStatus';
import { DEFAULT_HOSPITAL, type Hospital } from '../data/hospitals';
import { formatPhone, telHref, timeAgo, toBnDigits } from '../lib/bn';
import { useStoredState, type Route } from '../lib/hooks';
import { STALE_AFTER_MS, useApp, useOnDutyDoctors, useWards, type WardView } from '../state/app';

function OnDutyDoctors({ ward, doctors }: { ward: WardView; doctors: DoctorProfile[] }) {
  if (ward.status === 'full') {
    return <Notice>সিট খালি হলে এখানে ডিউটির ডাক্তারের নম্বর দেখা যাবে।</Notice>;
  }
  if (doctors.length === 0) {
    return <Notice>এই মুহূর্তে এই ওয়ার্ডের কেউ অ্যাপে ডিউটিতে নেই।</Notice>;
  }
  return (
    <div>
      <h3 className="label">এখন ডিউটিতে</h3>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
        {doctors.map((d) => (
          <li key={d.uid}>
            <a href={telHref(d.phone)} className="flex items-center gap-3 px-3.5 py-3 active:bg-brand-50">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{d.name}</p>
                <p className="text-[15px] text-brand-700 tabular-nums">{formatPhone(d.phone)}</p>
              </div>
              <CallCircle />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WardDetail({ ward, hospital }: { ward: WardView; hospital: Hospital }) {
  const { now, isDoctor } = useApp();
  const onDuty = useOnDutyDoctors();
  const stale = ward.updatedAt !== undefined && now - ward.updatedAt > STALE_AFTER_MS;

  return (
    <section className="card mt-3 space-y-3" aria-live="polite">
      <div>
        <h2 className="text-[21px] leading-snug font-semibold">{ward.nameBn}</h2>
        <p className="text-[14px] text-ink-500">{hospital.nameBn}</p>
      </div>
      <StatusBlock status={ward.status} />
      <p className="text-[15px] text-ink-500">
        {ward.updatedAt !== undefined
          ? `ডাক্তার জানিয়েছেন ${timeAgo(ward.updatedAt, now)}`
          : 'এই ওয়ার্ডের খবর এখনো কোনো ডাক্তার দেননি।'}
      </p>
      {stale && <Notice tone="warn">খবরটা ৬ ঘণ্টার বেশি পুরনো। রোগী নিয়ে যাওয়ার আগে ফোন করে নিশ্চিত হোন।</Notice>}
      {isDoctor ? (
        <OnDutyDoctors ward={ward} doctors={onDuty.filter((d) => d.wardId === ward.id)} />
      ) : (
        <CallButton phone={hospital.phone} label="হাসপাতালে ফোন" />
      )}
    </section>
  );
}

export function WardsPage({ go }: { go: (r: Route) => void }) {
  const { user } = useApp();
  const hospital = DEFAULT_HOSPITAL;
  const { wards, loaded, error } = useWards(hospital.id);
  const [selectedId, setSelectedId] = useStoredState<string>('careq-ward', '');
  const [onlyOpen, setOnlyOpen] = useState(false);
  const selected = wards.find((w) => w.id === selectedId);

  const openCount = wards.filter((w) => w.status === 'open').length;
  const fullCount = wards.filter((w) => w.status === 'full').length;
  const list = onlyOpen ? wards.filter((w) => w.status === 'open') : wards;

  const pick = (id: string) => {
    setSelectedId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <PageTitle title="কোন ওয়ার্ডে সিট আছে?" subtitle="রোগী নিয়ে যাওয়ার আগে দেখে নিন।" />

      <Field label="ওয়ার্ড বেছে নিন" htmlFor="ward-select">
        <select id="ward-select" className="input" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          <option value="">ওয়ার্ড বেছে নিন</option>
          {wards.map((w) => (
            <option key={w.id} value={w.id}>
              {w.nameBn}
            </option>
          ))}
        </select>
      </Field>

      {selected && <WardDetail ward={selected} hospital={hospital} />}

      {error && (
        <div className="mt-3">
          <Notice tone="warn">তথ্য আনা যাচ্ছে না। ইন্টারনেট সংযোগ দেখুন।</Notice>
        </div>
      )}

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <h2 className="text-[17px] font-semibold">সব ওয়ার্ড</h2>
          <button
            type="button"
            className="chip min-h-9 px-3 text-[14px]"
            aria-pressed={onlyOpen}
            onClick={() => setOnlyOpen(!onlyOpen)}
          >
            শুধু সিট আছে ({toBnDigits(openCount)})
          </button>
        </div>
        {!loaded && !error ? (
          <p className="card text-ink-500">লোড হচ্ছে…</p>
        ) : list.length === 0 ? (
          <p className="card text-ink-500">এখন কোনো ওয়ার্ডে সিট খালি থাকার খবর নেই।</p>
        ) : (
          <ul className="card divide-y divide-line overflow-hidden p-0">
            {list.map((w) => (
              <li key={w.id}>
                <button
                  type="button"
                  onClick={() => pick(w.id)}
                  className={`flex min-h-13 w-full items-center gap-3 px-4 py-2.5 text-left active:bg-brand-50 ${
                    w.id === selectedId ? 'bg-brand-50' : ''
                  }`}
                >
                  <span className="min-w-0 flex-1 leading-snug">{w.nameBn}</span>
                  <StatusPill status={w.status} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {loaded && (
          <p className="mt-2 px-1 text-[14px] text-ink-500">
            সিট আছে {toBnDigits(openCount)} · সিট নেই {toBnDigits(fullCount)} · খবর নেই{' '}
            {toBnDigits(wards.length - openCount - fullCount)}
          </p>
        )}
      </section>

      {!user && (
        <button
          type="button"
          onClick={() => go('doctor')}
          className="mt-6 flex w-full items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3.5 text-left"
        >
          <span className="flex-1">
            <span className="block font-semibold text-brand-700">আপনি কি ডাক্তার?</span>
            <span className="block text-[14px] text-ink-500">লগইন করলে ডিউটির ডাক্তারদের নম্বর দেখবেন</span>
          </span>
          <ChevronRight className="text-brand-600" />
        </button>
      )}
    </>
  );
}
