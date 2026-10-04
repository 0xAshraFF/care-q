import { ArrowRightLeft, Bell, CircleCheck, Clock, LogOut, Pencil, Search } from 'lucide-react';
import { useState } from 'react';
import type { DoctorProfile, WardState } from '../backend/types';
import { AdminPanel } from '../components/AdminPanel';
import { IncomingList, ReferSheet, SentList } from '../components/Referrals';
import { BED_CHOICES, STATUS_META, bedsText } from '../components/WardStatus';
import { Field, Notice, PageTitle } from '../components/ui';
import { DEFAULT_HOSPITAL, HOSPITALS, findHospital } from '../data/hospitals';
import {
  cleanWardName,
  clockTimeWithDay,
  duration,
  formatPhone,
  isValidBdMobile,
  isValidBmdc,
  normalizeBdMobile,
  normalizeBmdc,
  timeAgo,
  toEnDigits,
  wardNameKey,
} from '../lib/bn';
import { endFromTimeInput, isOnDuty, shiftEndChoices } from '../lib/duty';
import { askNotifyPermission, notifyPermission } from '../lib/notify';
import type { Route } from '../lib/hooks';
import { STALE_AFTER_MS, useApp, useOnDutyDoctors, useWards } from '../state/app';

const NEW_WARD = '__new__';

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
  const [bmdc, setBmdc] = useState(existing?.bmdc ?? '');
  const [hospitalId, setHospitalId] = useState(existing?.hospitalId ?? DEFAULT_HOSPITAL.id);
  const [wardId, setWardId] = useState(existing ? existing.wardId || (existing.newWardName ? NEW_WARD : '') : '');
  const [newWard, setNewWard] = useState(existing?.newWardName ?? '');
  const [busy, setBusy] = useState(false);
  const { wards } = useWards(hospitalId);

  const missing =
    name.trim().length < 2
      ? 'আপনার নাম লিখুন।'
      : !isValidBdMobile(phone)
        ? 'সঠিক মোবাইল নম্বর দিন (01 দিয়ে শুরু, ১১ সংখ্যা)।'
        : !isValidBmdc(bmdc)
          ? 'বিএমডিসি রেজিস্ট্রেশন নম্বর দিন।'
          : wardId === ''
            ? 'ওয়ার্ড বেছে নিন।'
            : wardId === NEW_WARD && newWard.trim().length < 2
              ? 'ওয়ার্ডের নাম লিখুন।'
              : null;

  // Approval is for this name and BMDC number; changing either sends the profile back for review.
  const keepsApproval =
    existing?.approved === true && existing.name === name.trim() && existing.bmdc === normalizeBmdc(bmdc);

  const submit = async () => {
    if (!backend || !user || missing) return;
    setBusy(true);
    try {
      let id = wardId;
      let requested = '';
      if (wardId === NEW_WARD) {
        const wardName = cleanWardName(newWard);
        const same = wards.find((w) => wardNameKey(w.nameBn) === wardNameKey(wardName));
        if (same) id = same.id;
        else if (keepsApproval) id = await backend.addWard(user.uid, hospitalId, wardName);
        else {
          // Not approved yet: the admin creates this ward when approving.
          id = '';
          requested = wardName;
        }
      }
      await backend.saveProfile(
        user.uid,
        {
          name: name.trim(),
          phone: normalizeBdMobile(phone),
          bmdc: normalizeBmdc(bmdc),
          hospitalId,
          wardId: id,
          newWardName: requested,
        },
        keepsApproval,
        keepsApproval ? (existing?.dutyUntil ?? null) : null,
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
        subtitle={existing ? undefined : 'যাচাই করে অনুমোদন দেওয়া হবে। পরের বার থেকে শুধু লগইন করলেই হবে।'}
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
        <Field label="মোবাইল নম্বর" htmlFor="doc-phone" hint="শুধু অনুমোদিত ডাক্তাররা এই নম্বর দেখবেন, তাও আপনি ডিউটিতে থাকলে।">
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
        <Field label="বিএমডিসি রেজিস্ট্রেশন নম্বর" htmlFor="doc-bmdc" hint="যাচাইয়ের জন্য লাগবে।">
          <input
            id="doc-bmdc"
            className="input tabular-nums"
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="যেমন: A-12345"
            maxLength={20}
            value={bmdc}
            onChange={(e) => setBmdc(toEnDigits(e.target.value))}
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
        {existing?.approved && !keepsApproval && missing === null && (
          <Notice tone="warn">নাম বা বিএমডিসি নম্বর বদলালে আবার অনুমোদন লাগবে।</Notice>
        )}
        {missing && <p className="text-[15px] font-medium text-warn-700">{missing}</p>}
        <div className="flex gap-2">
          {onDone && (
            <button type="button" className="btn btn-soft flex-1" onClick={onDone}>
              বাতিল
            </button>
          )}
          <button type="submit" className="btn btn-primary flex-1" disabled={busy || missing !== null}>
            {existing ? 'সেভ করুন' : 'জমা দিন'}
          </button>
        </div>
      </form>
    </>
  );
}

function PendingCard({ profile }: { profile: DoctorProfile }) {
  const { wards } = useWards(profile.hospitalId);
  const ward = profile.wardId
    ? (wards.find((w) => w.id === profile.wardId)?.nameBn ?? '…')
    : `${profile.newWardName} (নতুন)`;
  return (
    <section className="card space-y-3 border-[#f3dfb4] bg-warn-50">
      <p className="flex items-center gap-2 font-semibold text-warn-700">
        <Clock size={20} /> অনুমোদনের অপেক্ষায়
      </p>
      <p className="text-[16px] text-ink-700">
        আপনার তথ্য জমা হয়েছে। অ্যাডমিন ফোনে যাচাই করে অনুমোদন দিলে নিজের ওয়ার্ডের অবস্থা জানাতে আর অন্য
        ডাক্তারদের নম্বর দেখতে পারবেন। অনুমোদন হলে এই পাতা নিজে থেকেই বদলে যাবে।
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-xl bg-white px-3.5 py-3 text-[15px]">
        <dt className="text-ink-500">মোবাইল</dt>
        <dd className="tabular-nums">{formatPhone(profile.phone)}</dd>
        <dt className="text-ink-500">বিএমডিসি</dt>
        <dd>{profile.bmdc}</dd>
        <dt className="text-ink-500">ওয়ার্ড</dt>
        <dd>{ward}</dd>
      </dl>
    </section>
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
      <section className="card flex items-center gap-3 border-ok-100 bg-ok-50 py-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-ok-700">
            <span className="size-2.5 rounded-full bg-ok-600" /> ডিউটিতে আছেন
          </p>
          <p className="text-[17px] leading-snug font-semibold">{clockTimeWithDay(profile.dutyUntil!, now)} পর্যন্ত</p>
          <p className="text-[14px] text-ink-500">
            আর {duration(profile.dutyUntil! - now)} ·{' '}
            {wardFull ? 'সিট নেই বলে আপনার নম্বর লুকানো' : 'অন্যরা আপনার নম্বর দেখছেন'} ·{' '}
            <button type="button" className="font-medium text-brand-700 underline" onClick={() => setEditing(true)}>
              সময় বদলান
            </button>
          </p>
        </div>
        <button
          type="button"
          className="btn shrink-0 border border-bad-100 bg-white px-3 text-[15px] text-bad-700 active:bg-bad-50"
          onClick={() => void endDutyAndSignOut()}
        >
          <LogOut size={18} /> ডিউটি শেষ
        </button>
      </section>
    );
  }

  const start = async () => {
    if (!backend || until === null) return;
    // Still inside the tap, so the browser allows the permission prompt.
    void askNotifyPermission();
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
            চালু করলে অন্য ওয়ার্ডের ডাক্তাররা আপনাকে ফোন ও রেফার করতে পারবেন। ডিউটি শেষ হলে নিজে থেকেই লগ আউট।
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
          id="duty-other-time"
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

function NotifyPrompt() {
  const [perm, setPerm] = useState(notifyPermission);
  if (perm === 'granted' || perm === 'unsupported') return null;
  if (perm === 'denied') {
    return (
      <p className="px-1 text-[14px] text-ink-500">
        রেফারের নোটিফিকেশন বন্ধ আছে। চালু করতে ব্রাউজারের সেটিংসে এই সাইটকে নোটিফিকেশনের অনুমতি দিন।
      </p>
    );
  }
  return (
    <section className="card flex items-center gap-3 py-3">
      <Bell size={22} className="shrink-0 text-brand-600" />
      <p className="min-w-0 flex-1 text-[15px] leading-snug">রেফার এলে ফোনে নোটিফিকেশন পেতে চান?</p>
      <button
        type="button"
        className="btn btn-soft shrink-0 px-3 text-[15px]"
        onClick={async () => setPerm(await askNotifyPermission())}
      >
        চালু করুন
      </button>
    </section>
  );
}

const PICKABLE: WardState[] = ['open', 'emergency', 'full'];

function MyWardCard({ profile }: { profile: DoctorProfile }) {
  const { backend, now, toast } = useApp();
  const { wards, loaded } = useWards(profile.hospitalId);
  const onDuty = useOnDutyDoctors();
  const ward = wards.find((w) => w.id === profile.wardId);
  if (!loaded) return null;
  if (!ward) {
    return <Notice tone="warn">আপনার ওয়ার্ডটা তালিকায় পাওয়া যাচ্ছে না। নিচে "তথ্য বদলান" থেকে আবার বেছে নিন।</Notice>;
  }

  const save = (status: WardState, freeBeds: number | null, msg: string) => {
    backend
      ?.setWardStatus(profile.uid, profile.hospitalId, ward.id, status, status === 'full' ? null : freeBeds)
      .then(() => toast(msg))
      .catch(() => toast('আপডেট হয়নি। আবার চেষ্টা করুন।'));
  };

  const by =
    ward.updatedByUid === profile.uid ? 'আপনি' : onDuty.find((d) => d.uid === ward.updatedByUid)?.name ?? null;
  const stale = ward.updatedAt !== undefined && now - ward.updatedAt > STALE_AFTER_MS;

  const ACTIVE: Record<WardState, string> = {
    open: 'border-ok-600 bg-ok-600 text-white',
    emergency: 'border-warn-600 bg-warn-600 text-white',
    full: 'border-bad-600 bg-bad-600 text-white',
  };

  return (
    <section className="card space-y-3">
      <div>
        <h2 className="text-[19px] leading-snug font-semibold">{ward.nameBn}-এর অবস্থা</h2>
        <p className="text-[14px] text-ink-500">চাপ দিলেই সবাই দেখতে পাবেন।</p>
      </div>
      <div className="space-y-2">
        {PICKABLE.map((s) => {
          const meta = STATUS_META[s];
          const active = ward.status === s;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={active}
              onClick={() => save(s, ward.freeBeds, `জানানো হয়েছে: ${meta.label}`)}
              className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                active ? ACTIVE[s] : `${meta.block} bg-white`
              }`}
            >
              <meta.Icon size={28} className="shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-[19px] leading-tight font-semibold">{meta.label}</span>
                <span className={`block text-[14px] leading-snug ${active ? 'text-white/90' : 'text-ink-500'}`}>
                  {meta.hint}
                </span>
              </span>
              {active && <CircleCheck size={22} className="shrink-0" />}
            </button>
          );
        })}
      </div>
      {(ward.status === 'open' || ward.status === 'emergency') && (
        <Field label="খালি বেড (না দিলেও চলবে)" htmlFor="my-ward-beds">
          <select
            id="my-ward-beds"
            className="input"
            value={ward.freeBeds ?? ''}
            onChange={(e) => {
              const n = e.target.value === '' ? null : Number(e.target.value);
              save(ward.status as WardState, n, n ? `জানানো হয়েছে: ${bedsText(n)}` : 'বেডের সংখ্যা মুছে দেওয়া হয়েছে');
            }}
          >
            <option value="">জানা নেই</option>
            {BED_CHOICES.map((n) => (
              <option key={n} value={n}>
                {bedsText(n)}
              </option>
            ))}
          </select>
        </Field>
      )}
      <p className="text-[14px] text-ink-500">
        {ward.updatedAt !== undefined
          ? `শেষ আপডেট ${timeAgo(ward.updatedAt, now)}${by ? ` · ${by}` : ''}`
          : 'এখনো কেউ জানায়নি।'}
      </p>
      {stale && <Notice tone="warn">অনেকক্ষণ আপডেট হয়নি। অবস্থা একই থাকলে ওপরের বোতামে আবার চাপ দিন।</Notice>}
    </section>
  );
}

export function DoctorPage({ go }: { go: (r: Route) => void }) {
  const { backend, authReady, user, profile, now, isAdmin, adminChecked, endDutyAndSignOut } = useApp();
  const [editing, setEditing] = useState(false);
  const [joining, setJoining] = useState(false);
  const [referring, setReferring] = useState(false);
  const { wards } = useWards(profile?.hospitalId ?? DEFAULT_HOSPITAL.id);

  if (!backend || !authReady || (user && (profile === undefined || !adminChecked))) {
    return <p className="card text-ink-500">লোড হচ্ছে…</p>;
  }
  if (!user) return <SignIn />;
  if (editing && profile) return <ProfileForm existing={profile} onDone={() => setEditing(false)} />;

  const footer = (
    <div className="flex justify-between pt-2">
      {profile ? (
        <button type="button" className="btn-ghost btn px-3" onClick={() => setEditing(true)}>
          <Pencil size={18} /> তথ্য বদলান
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        className="btn-ghost btn px-3 text-ink-500"
        onClick={() => void (profile && isOnDuty(profile.dutyUntil, now) ? endDutyAndSignOut() : backend.signOut())}
      >
        <LogOut size={18} /> লগ আউট
      </button>
    </div>
  );

  // Signed in, no doctor profile: an admin who isn't a doctor, or a doctor registering.
  if (!profile) {
    if (isAdmin && !joining) {
      return (
        <>
          <PageTitle title="অ্যাডমিন" subtitle="নতুন ডাক্তারকে ফোন করে বিএমডিসি নম্বর ও ওয়ার্ড মিলিয়ে অনুমোদন দিন।" />
          <div className="space-y-4">
            <AdminPanel />
            <button type="button" className="btn btn-soft w-full" onClick={() => setJoining(true)}>
              নিজেও ডাক্তার হিসেবে যোগ দিন
            </button>
            {footer}
          </div>
        </>
      );
    }
    return <ProfileForm onDone={isAdmin ? () => setJoining(false) : undefined} />;
  }

  const hospital = findHospital(profile.hospitalId) ?? DEFAULT_HOSPITAL;

  if (!profile.approved) {
    return (
      <>
        <PageTitle title={profile.name} subtitle={hospital.shortBn} />
        <div className="space-y-4">
          <PendingCard profile={profile} />
          {isAdmin && <AdminPanel />}
          {footer}
        </div>
      </>
    );
  }

  const ward = wards.find((w) => w.id === profile.wardId);

  return (
    <>
      <PageTitle title={profile.name} subtitle={`${hospital.shortBn} · ${ward?.nameBn ?? '…'}`} />
      <div className="space-y-4">
        <DutyCard key={isOnDuty(profile.dutyUntil, now) ? 'on' : 'off'} profile={profile} wardFull={ward?.status === 'full'} />
        <NotifyPrompt />
        <IncomingList />
        <MyWardCard profile={profile} />
        <div className="space-y-2">
          <button type="button" className="btn btn-primary min-h-15 w-full text-[18px]" onClick={() => setReferring(true)}>
            <ArrowRightLeft size={21} /> রোগী রেফার করুন
          </button>
          <button type="button" className="btn btn-ghost w-full" onClick={() => go('ward')}>
            <Search size={19} /> সব ওয়ার্ডের অবস্থা দেখুন
          </button>
        </div>
        <SentList />
        <ReferSheet open={referring} onClose={() => setReferring(false)} />
        {isAdmin && (
          <div className="pt-4">
            <AdminPanel />
          </div>
        )}
        {footer}
      </div>
    </>
  );
}
