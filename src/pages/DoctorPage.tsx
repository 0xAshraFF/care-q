import { CircleCheck, CircleX, LogOut, Pencil, Search } from 'lucide-react';
import { useState } from 'react';
import type { DoctorProfile } from '../backend/types';
import { Field, Notice, PageTitle } from '../components/ui';
import { DEFAULT_HOSPITAL, HOSPITALS, findHospital } from '../data/hospitals';
import { clockTimeWithDay, duration, isValidBdMobile, normalizeBdMobile, timeAgo, toEnDigits } from '../lib/bn';
import { endFromTimeInput, isOnDuty, shiftEndChoices } from '../lib/duty';
import type { Route } from '../lib/hooks';
import { STALE_AFTER_MS, useApp, useOnDutyDoctors, useWards } from '../state/app';

const NEW_WARD = '__new__';

function normalizeName(s: string): string {
  return toEnDigits(s).trim().replace(/\s+/g, ' ').toLowerCase();
}

function SignIn() {
  const { backend, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const demo = backend?.mode === 'demo';

  return (
    <>
      <PageTitle title="ডাক্তারদের জন্য" subtitle="রোগী বা স্বজনদের লগইন করতে হবে না।" />
      <section className="card space-y-4">
        <ul className="space-y-2.5 text-[16px] text-ink-700">
          <li className="flex gap-2.5">
            <CircleCheck className="mt-0.5 shrink-0 text-ok-600" size={20} />
            নিজের ওয়ার্ডে সিট আছে কি না, এক চাপে জানান।
          </li>
          <li className="flex gap-2.5">
            <CircleCheck className="mt-0.5 shrink-0 text-ok-600" size={20} />
            রেফার করার আগে অন্য ওয়ার্ডে সিট দেখুন, ডিউটির ডাক্তারকে সরাসরি ফোন করুন।
          </li>
          <li className="flex gap-2.5">
            <CircleCheck className="mt-0.5 shrink-0 text-ok-600" size={20} />
            ডিউটি শেষ হলে নিজে থেকেই লগ আউট।
          </li>
        </ul>
        <button
          type="button"
          className="btn btn-primary w-full"
          disabled={!backend || busy}
          onClick={async () => {
            setBusy(true);
            try {
              await backend!.signIn();
            } catch {
              toast('লগইন হয়নি। আবার চেষ্টা করুন।');
            } finally {
              setBusy(false);
            }
          }}
        >
          {demo ? 'ডেমো ডাক্তার হিসেবে ঢুকুন' : 'Gmail দিয়ে ঢুকুন'}
        </button>
      </section>
    </>
  );
}

function ProfileForm({ existing, onDone }: { existing?: DoctorProfile; onDone?: () => void }) {
  const { backend, user, toast } = useApp();
  const [name, setName] = useState(existing?.name ?? user?.displayName ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [hospitalId, setHospitalId] = useState(existing?.hospitalId ?? DEFAULT_HOSPITAL.id);
  const [wardId, setWardId] = useState(existing?.wardId ?? '');
  const [newWard, setNewWard] = useState('');
  const [busy, setBusy] = useState(false);
  const { wards } = useWards(hospitalId);

  const missing =
    name.trim().length < 2
      ? 'আপনার নাম লিখুন।'
      : !isValidBdMobile(phone)
        ? 'সঠিক মোবাইল নম্বর দিন (01 দিয়ে শুরু, ১১ সংখ্যা)।'
        : wardId === ''
          ? 'ওয়ার্ড বেছে নিন।'
          : wardId === NEW_WARD && newWard.trim().length < 2
            ? 'ওয়ার্ডের নাম লিখুন।'
            : null;

  const submit = async () => {
    if (!backend || !user || missing) return;
    setBusy(true);
    try {
      let id = wardId;
      if (wardId === NEW_WARD) {
        const name = newWard.trim().replace(/\s+/g, ' ');
        const same = wards.find((w) => normalizeName(w.nameBn) === normalizeName(name));
        id = same ? same.id : await backend.addWard(user.uid, hospitalId, name);
      }
      await backend.saveProfile(
        user.uid,
        { name: name.trim(), phone: normalizeBdMobile(phone), hospitalId, wardId: id },
        existing?.dutyUntil ?? null,
      );
      toast('সেভ হয়েছে');
      onDone?.();
    } catch {
      toast('সেভ হয়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageTitle
        title={existing ? 'আপনার তথ্য' : 'একবার নিজের তথ্য দিন'}
        subtitle="পরের বার থেকে শুধু লগইন করলেই হবে।"
      />
      <form
        className="card space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field label="আপনার নাম" htmlFor="doc-name">
          <input id="doc-name" className="input" placeholder="যেমন: ডা. রাশেদ করিম" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="মোবাইল নম্বর" htmlFor="doc-phone" hint="শুধু লগইন করা ডাক্তাররা এই নম্বর দেখবেন, তাও আপনি ডিউটিতে থাকলে।">
          <input
            id="doc-phone"
            className="input tabular-nums"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="01XXXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(toEnDigits(e.target.value))}
          />
        </Field>
        {HOSPITALS.length > 1 && (
          <Field label="হাসপাতাল" htmlFor="doc-hospital">
            <select
              id="doc-hospital"
              className="input"
              value={hospitalId}
              onChange={(e) => {
                setHospitalId(e.target.value);
                setWardId('');
              }}
            >
              {HOSPITALS.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.nameBn}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label={`কোন ওয়ার্ডে ডিউটি করেন (${findHospital(hospitalId)?.shortBn ?? ''})`} htmlFor="doc-ward">
          <select id="doc-ward" className="input" value={wardId} onChange={(e) => setWardId(e.target.value)}>
            <option value="">ওয়ার্ড বেছে নিন</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                {w.nameBn}
              </option>
            ))}
            <option value={NEW_WARD}>+ আমার ওয়ার্ড তালিকায় নেই</option>
          </select>
        </Field>
        {wardId === NEW_WARD && (
          <Field label="ওয়ার্ড বা ইউনিটের নাম" htmlFor="doc-new-ward" hint="অন্য ডাক্তাররাও এই নামেই খুঁজবেন।">
            <input
              id="doc-new-ward"
              className="input"
              placeholder="যেমন: মেডিসিন ইউনিট ৩"
              maxLength={60}
              value={newWard}
              onChange={(e) => setNewWard(e.target.value)}
            />
          </Field>
        )}
        {missing && <p className="text-[15px] font-medium text-warn-700">{missing}</p>}
        <div className="flex gap-2">
          {onDone && (
            <button type="button" className="btn btn-soft flex-1" onClick={onDone}>
              বাতিল
            </button>
          )}
          <button type="submit" className="btn btn-primary flex-1" disabled={busy || missing !== null}>
            সেভ করুন
          </button>
        </div>
      </form>
    </>
  );
}

function DutyCard({ profile, wardFull }: { profile: DoctorProfile; wardFull: boolean }) {
  const { backend, now, toast, endDutyAndSignOut } = useApp();
  const onDuty = isOnDuty(profile.dutyUntil, now);
  const [editing, setEditing] = useState(false);
  const choices = shiftEndChoices(now);
  const [pick, setPick] = useState<number | 'other'>(choices[0] ?? 'other');
  const [otherTime, setOtherTime] = useState('');
  const until = pick === 'other' ? endFromTimeInput(otherTime, now) : pick;

  if (onDuty && !editing) {
    return (
      <section className="card space-y-3 border-ok-100 bg-ok-50">
        <p className="flex items-center gap-2 font-semibold text-ok-700">
          <span className="size-2.5 rounded-full bg-ok-600" /> ডিউটিতে আছেন
        </p>
        <div>
          <p className="text-[22px] leading-tight font-semibold">{clockTimeWithDay(profile.dutyUntil!, now)} পর্যন্ত</p>
          <p className="text-[15px] text-ink-500">আর {duration(profile.dutyUntil! - now)}। তারপর নিজে থেকেই লগ আউট হবে।</p>
        </div>
        <p className="text-[15px] text-ink-700">
          {wardFull
            ? 'ওয়ার্ডে সিট নেই বলে আপনার নম্বর এখন অন্যরা দেখছেন না।'
            : 'অন্য ওয়ার্ডের ডাক্তাররা আপনার নম্বর দেখে ফোন করতে পারবেন।'}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-soft bg-white" onClick={() => setEditing(true)}>
            সময় বদলান
          </button>
          <button
            type="button"
            className="btn border border-bad-100 bg-white text-bad-700 active:bg-bad-50"
            onClick={() => void endDutyAndSignOut()}
          >
            <LogOut size={19} /> ডিউটি শেষ
          </button>
        </div>
      </section>
    );
  }

  const start = async () => {
    if (!backend || until === null) return;
    setEditing(false);
    try {
      await backend.setDuty(profile.uid, until);
    } catch {
      toast('হয়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।');
    }
  };

  return (
    <section className="card space-y-4">
      <div>
        <h2 className="text-[19px] font-semibold">{editing ? 'ডিউটি কখন শেষ?' : 'ডিউটিতে আছেন?'}</h2>
        {!editing && (
          <p className="text-[15px] text-ink-500">
            চালু করলে অন্য ওয়ার্ডের ডাক্তাররা দরকারে আপনাকে ফোন করতে পারবেন। ডিউটি কখন শেষ?
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {choices.map((t) => (
          <button key={t} type="button" className="chip" aria-pressed={pick === t} onClick={() => setPick(t)}>
            {clockTimeWithDay(t, now)}
          </button>
        ))}
        <button type="button" className="chip" aria-pressed={pick === 'other'} onClick={() => setPick('other')}>
          অন্য সময়
        </button>
      </div>
      {pick === 'other' && (
        <input
          type="time"
          className="input"
          aria-label="ডিউটি শেষের সময়"
          value={otherTime}
          onChange={(e) => setOtherTime(e.target.value)}
        />
      )}
      {until !== null && (
        <p className="text-[15px] text-ink-500">
          {clockTimeWithDay(until, now)} পর্যন্ত · আর {duration(until - now)}
        </p>
      )}
      <div className="flex gap-2">
        {editing && (
          <button type="button" className="btn btn-soft flex-1" onClick={() => setEditing(false)}>
            বাতিল
          </button>
        )}
        <button type="button" className="btn btn-primary flex-1" disabled={until === null} onClick={() => void start()}>
          {editing ? 'ঠিক আছে' : 'ডিউটি শুরু'}
        </button>
      </div>
    </section>
  );
}

function MyWardCard({ profile }: { profile: DoctorProfile }) {
  const { backend, now, toast } = useApp();
  const { wards, loaded } = useWards(profile.hospitalId);
  const onDuty = useOnDutyDoctors();
  const ward = wards.find((w) => w.id === profile.wardId);
  if (!loaded) return null;
  if (!ward) {
    return <Notice tone="warn">আপনার ওয়ার্ডটা তালিকায় পাওয়া যাচ্ছে না। নিচে "তথ্য বদলান" থেকে আবার বেছে নিন।</Notice>;
  }

  const set = (full: boolean) => {
    backend
      ?.setWardFull(profile.uid, profile.hospitalId, ward.id, full)
      .then(() => toast(full ? 'জানানো হয়েছে: সিট নেই' : 'জানানো হয়েছে: সিট আছে'))
      .catch(() => toast('আপডেট হয়নি। আবার চেষ্টা করুন।'));
  };

  const by =
    ward.updatedByUid === profile.uid ? 'আপনি' : onDuty.find((d) => d.uid === ward.updatedByUid)?.name ?? null;
  const stale = ward.updatedAt !== undefined && now - ward.updatedAt > STALE_AFTER_MS;

  const option = (full: boolean) => {
    const active = ward.status === (full ? 'full' : 'open');
    const Icon = full ? CircleX : CircleCheck;
    const tone = full
      ? active
        ? 'border-bad-600 bg-bad-600 text-white'
        : 'border-bad-100 bg-white text-bad-700 active:bg-bad-50'
      : active
        ? 'border-ok-600 bg-ok-600 text-white'
        : 'border-ok-100 bg-white text-ok-700 active:bg-ok-50';
    return (
      <button
        type="button"
        aria-pressed={active}
        onClick={() => set(full)}
        className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border-2 text-[19px] font-semibold ${tone}`}
      >
        <Icon size={28} />
        {full ? 'সিট নেই' : 'সিট আছে'}
      </button>
    );
  };

  return (
    <section className="card space-y-3">
      <h2 className="text-[19px] leading-snug font-semibold">{ward.nameBn}-এ এখন সিট আছে?</h2>
      <div className="grid grid-cols-2 gap-2">
        {option(false)}
        {option(true)}
      </div>
      <p className="text-[15px] text-ink-500">
        {ward.updatedAt !== undefined
          ? `শেষ আপডেট ${timeAgo(ward.updatedAt, now)}${by ? ` · ${by}` : ''}`
          : 'এখনো কেউ জানায়নি।'}
      </p>
      {stale && <Notice tone="warn">অনেকক্ষণ আপডেট হয়নি। অবস্থা একই থাকলে ওপরের বোতামে আবার চাপ দিন।</Notice>}
    </section>
  );
}

export function DoctorPage({ go }: { go: (r: Route) => void }) {
  const { backend, authReady, user, profile, now, endDutyAndSignOut } = useApp();
  const [editing, setEditing] = useState(false);
  const { wards } = useWards(profile?.hospitalId ?? DEFAULT_HOSPITAL.id);

  if (!backend || !authReady || (user && profile === undefined)) {
    return <p className="card text-ink-500">লোড হচ্ছে…</p>;
  }
  if (!user) return <SignIn />;
  if (!profile) return <ProfileForm />;
  if (editing) return <ProfileForm existing={profile} onDone={() => setEditing(false)} />;

  const hospital = findHospital(profile.hospitalId) ?? DEFAULT_HOSPITAL;
  const ward = wards.find((w) => w.id === profile.wardId);

  return (
    <>
      <PageTitle title={profile.name} subtitle={`${hospital.shortBn} · ${ward?.nameBn ?? '…'}`} />
      <div className="space-y-4">
        <DutyCard key={isOnDuty(profile.dutyUntil, now) ? 'on' : 'off'} profile={profile} wardFull={ward?.status === 'full'} />
        <MyWardCard profile={profile} />
        <button type="button" className="btn btn-soft w-full" onClick={() => go('ward')}>
          <Search size={20} /> রেফারের আগে অন্য ওয়ার্ডে সিট দেখুন
        </button>
        <div className="flex justify-between pt-2">
          <button type="button" className="btn-ghost btn px-3" onClick={() => setEditing(true)}>
            <Pencil size={18} /> তথ্য বদলান
          </button>
          <button
            type="button"
            className="btn-ghost btn px-3 text-ink-500"
            onClick={() => void (isOnDuty(profile.dutyUntil, now) ? endDutyAndSignOut() : backend.signOut())}
          >
            <LogOut size={18} /> লগ আউট
          </button>
        </div>
      </div>
    </>
  );
}
