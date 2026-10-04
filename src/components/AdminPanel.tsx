import { Phone, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DoctorProfile } from '../backend/types';
import { DEFAULT_HOSPITAL } from '../data/hospitals';
import { formatPhone, telHref, toBnDigits, wardNameKey } from '../lib/bn';
import { useApp, useWards, type WardView } from '../state/app';

export const ROLE_LABEL: Record<DoctorProfile['role'], string> = {
  doctor: 'ডাক্তার',
  incharge: 'ওয়ার্ড ইনচার্জ',
};

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
        // Only the app admin sees requests for new wards. Reuse a ward with the same name if one exists.
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
          {ROLE_LABEL[d.role]} · {wardLabel(d, wards)}
        </p>
      </div>
      <a href={telHref(d.phone)} className="btn btn-soft w-full">
        <Phone size={19} /> ফোন করুন <span className="font-normal text-ink-500 tabular-nums">{formatPhone(d.phone)}</span>
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
            {ROLE_LABEL[d.role]} · {wardLabel(d, wards)} · {formatPhone(d.phone)}
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
            অনুমোদন তুলে নিলে উনি আর ওয়ার্ডের অবস্থা বদলাতে, রেফার করতে বা নম্বর দেখতে পারবেন না।
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

/**
 * Approvals. A ward in-charge sees the doctors of their own ward; the app admin sees everyone
 * (in-charges, and doctors whose ward has no in-charge yet or doesn't exist yet).
 */
export function AdminPanel() {
  const { backend, profile, isIncharge, isSuperAdmin } = useApp();
  const [docs, setDocs] = useState<DoctorProfile[] | null>(null);
  // Pilot: every doctor is at the default hospital. With more hospitals, look wards up per doctor.
  const { wards } = useWards(DEFAULT_HOSPITAL.id);

  useEffect(() => {
    if (!backend) return;
    return backend.watchAllDoctors(setDocs, () => setDocs([]));
  }, [backend]);

  if (docs === null || !(isSuperAdmin || isIncharge)) return null;
  const myWardId = profile?.wardId;
  const inScope = (d: DoctorProfile) =>
    d.uid !== profile?.uid && (isSuperAdmin || (d.role === 'doctor' && d.wardId === myWardId));
  const byName = (a: DoctorProfile, b: DoctorProfile) => a.name.localeCompare(b.name, 'bn');
  const pending = docs.filter((d) => !d.approved && inScope(d)).sort(byName);
  const approved = docs.filter((d) => d.approved && inScope(d)).sort(byName);
  const wardName = wards.find((w) => w.id === myWardId)?.nameBn;

  return (
    <section className="space-y-3">
      <div className="px-1">
        <h2 className="flex items-center gap-2 text-[19px] font-semibold">
          <ShieldCheck size={22} className="text-brand-600" />
          অনুমোদনের অপেক্ষায় ({toBnDigits(pending.length)})
        </h2>
        <p className="text-[14px] text-ink-500">
          {isSuperAdmin
            ? 'অ্যাপ অ্যাডমিন: ওয়ার্ড ইনচার্জ আর নতুন ওয়ার্ডের আবেদন আপনার কাছে আসবে।'
            : `${wardName ?? 'আপনার ওয়ার্ড'}-এর ডাক্তাররা। চেনা মানুষ কি না, ফোন করে নিশ্চিত হয়ে অনুমোদন দিন।`}
        </p>
      </div>
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
            অনুমোদিত ({toBnDigits(approved.length)})
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
