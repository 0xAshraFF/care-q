import { Phone, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DoctorProfile } from '../backend/types';
import { DEFAULT_HOSPITAL, findHospital } from '../data/hospitals';
import { formatPhone, telHref, toBnDigits, wardNameKey } from '../lib/bn';
import { useApp, useWards, type WardView } from '../state/app';

function wardLabel(d: DoctorProfile, wards: WardView[]): string {
  if (d.wardId) return wards.find((w) => w.id === d.wardId)?.nameBn ?? 'অজানা ওয়ার্ড';
  return `নতুন ওয়ার্ড চেয়েছেন: ${d.newWardName}`;
}

function PendingDoctor({ d, wards }: { d: DoctorProfile; wards: WardView[] }) {
  const { backend, user, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const approve = async () => {
    if (!backend || !user) return;
    setBusy(true);
    try {
      let wardId = d.wardId;
      if (!wardId) {
        // Create the ward they asked for, unless someone already added one with the same name.
        const same = wards.find((w) => wardNameKey(w.nameBn) === wardNameKey(d.newWardName));
        wardId = same ? same.id : await backend.addWard(user.uid, d.hospitalId, d.newWardName);
      }
      await backend.adminUpdateDoctor(d.uid, { approved: true, wardId, newWardName: '' });
      toast(`${d.name}: অনুমোদন দেওয়া হয়েছে`);
    } catch {
      toast('হয়নি। আবার চেষ্টা করুন।');
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!backend) return;
    setBusy(true);
    try {
      await backend.deleteDoctor(d.uid);
    } catch {
      toast('হয়নি। আবার চেষ্টা করুন।');
      setBusy(false);
    }
  };

  return (
    <li className="card space-y-3">
      <div>
        <p className="text-[18px] font-semibold">{d.name}</p>
        <p className="text-[15px] text-ink-500">
          বিএমডিসি: <span className="font-medium text-ink-900">{d.bmdc}</span>
        </p>
        <p className="text-[15px] text-ink-500">
          {findHospital(d.hospitalId)?.shortBn} · {wardLabel(d, wards)}
        </p>
      </div>
      <a href={telHref(d.phone)} className="btn btn-soft w-full">
        <Phone size={19} /> ফোন করে যাচাই <span className="font-normal text-ink-500">{formatPhone(d.phone)}</span>
      </a>
      {confirming ? (
        <div className="space-y-2 rounded-xl bg-bad-50 p-3">
          <p className="text-[15px] font-medium text-bad-700">{d.name}-এর আবেদন বাতিল করবেন?</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="btn btn-soft bg-white">
              না
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void reject()}
              className="btn bg-bad-600 text-white active:bg-bad-700"
            >
              হ্যাঁ, বাতিল
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirming(true)}
            className="btn border border-bad-100 bg-white text-bad-700 active:bg-bad-50"
          >
            বাতিল
          </button>
          <button type="button" disabled={busy} onClick={() => void approve()} className="btn btn-primary">
            অনুমোদন দিন
          </button>
        </div>
      )}
    </li>
  );
}

function ApprovedDoctor({ d, wards }: { d: DoctorProfile; wards: WardView[] }) {
  const { backend, toast } = useApp();
  const [confirming, setConfirming] = useState(false);
  const revoke = () => {
    setConfirming(false);
    backend?.adminUpdateDoctor(d.uid, { approved: false, dutyUntil: null }).catch(() => toast('হয়নি। আবার চেষ্টা করুন।'));
  };
  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{d.name}</p>
          <p className="text-[14px] text-ink-500">
            {wardLabel(d, wards)} · বিএমডিসি {d.bmdc} · {formatPhone(d.phone)}
          </p>
        </div>
        {!confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="shrink-0 rounded-lg px-2 py-2 text-[14px] font-medium text-bad-700 active:bg-bad-50"
          >
            তুলে নিন
          </button>
        )}
      </div>
      {confirming && (
        <div className="space-y-2 rounded-xl bg-bad-50 p-3">
          <p className="text-[15px] text-bad-700">
            অনুমোদন তুলে নিলে উনি আর ওয়ার্ডের অবস্থা বদলাতে বা নম্বর দেখতে পারবেন না।
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConfirming(false)} className="btn btn-soft bg-white">
              না
            </button>
            <button type="button" onClick={revoke} className="btn bg-bad-600 text-white active:bg-bad-700">
              তুলে নিন
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

/** Admins approve doctors here after a quick phone call to check the BMDC number and ward. */
export function AdminPanel() {
  const { backend } = useApp();
  const [docs, setDocs] = useState<DoctorProfile[] | null>(null);
  // Pilot: every doctor is at the default hospital. With more hospitals, look wards up per doctor.
  const { wards } = useWards(DEFAULT_HOSPITAL.id);

  useEffect(() => {
    if (!backend) return;
    return backend.watchAllDoctors(setDocs, () => setDocs([]));
  }, [backend]);

  if (docs === null) return null;
  const byName = (a: DoctorProfile, b: DoctorProfile) => a.name.localeCompare(b.name, 'bn');
  const pending = docs.filter((d) => !d.approved).sort(byName);
  const approved = docs.filter((d) => d.approved).sort(byName);

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 px-1 text-[19px] font-semibold">
        <ShieldCheck size={22} className="text-brand-600" />
        অনুমোদনের অপেক্ষায় ({toBnDigits(pending.length)})
      </h2>
      {pending.length === 0 ? (
        <p className="card text-ink-500">এখন কেউ অপেক্ষায় নেই।</p>
      ) : (
        <ul className="space-y-3">
          {pending.map((d) => (
            <PendingDoctor key={d.uid} d={d} wards={wards} />
          ))}
        </ul>
      )}
      {approved.length > 0 && (
        <details className="card overflow-hidden p-0">
          <summary className="cursor-pointer px-4 py-3.5 font-semibold text-ink-700">
            অনুমোদিত ডাক্তার ({toBnDigits(approved.length)})
          </summary>
          <ul className="divide-y divide-line border-t border-line">
            {approved.map((d) => (
              <ApprovedDoctor key={d.uid} d={d} wards={wards} />
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
