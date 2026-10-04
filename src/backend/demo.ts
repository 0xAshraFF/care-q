// Demo backend: everything lives in this browser's localStorage.
// Used when no Firebase config is set, so the app can be clicked through before the project exists.
// The demo user is also an admin, so the approval flow can be tried end to end. Referrals are
// simulated too: the demo user's ward gets one incoming request, and requests the demo user sends
// are answered by a demo doctor a few seconds later.

import { load, save } from '../lib/storage';
import type { AuthUser, Backend, DoctorProfile, Transfer, WardDoc, WardState } from './types';

const KEY = 'careq-demo-v4';
const DEMO_UID = 'demo-doctor';

interface DemoState {
  signedIn: boolean;
  doctors: Record<string, DoctorProfile>;
  wards: Record<string, WardDoc>;
  transfers: Record<string, Transfer>;
  /** Wards that already got their one simulated incoming referral. */
  seededIncoming: string[];
}

function seed(): DemoState {
  const now = Date.now();
  const min = 60_000;
  const ward = (id: string, status: WardState, agoMin: number, freeBeds: number | null = null): WardDoc => ({
    id,
    hospitalId: 'dmch',
    status,
    freeBeds,
    updatedAt: now - agoMin * min,
    updatedByUid: 'demo-a',
  });
  // 010… isn't an assigned Bangladeshi prefix, so tapping a demo number can't ring a real person.
  const doctor = (uid: string, name: string, phone: string, wardId: string, approved = true): DoctorProfile => ({
    uid,
    name,
    phone,
    bmdc: `A-${phone.slice(-5)}`,
    hospitalId: 'dmch',
    wardId,
    newWardName: '',
    approved,
    dutyUntil: approved ? now + 6 * 60 * min : null,
  });
  return {
    signedIn: false,
    doctors: {
      'demo-a': doctor('demo-a', 'ডা. নুসরাত জাহান (ডেমো)', '01000000001', 'dmch-cardiology'),
      'demo-b': doctor('demo-b', 'ডা. তানভীর হাসান (ডেমো)', '01000000002', 'dmch-neurology'),
      'demo-c': doctor('demo-c', 'ডা. সাবরিনা ইসলাম (ডেমো)', '01000000003', 'dmch-medicine'),
      'demo-e': doctor('demo-e', 'ডা. ফারহানা আক্তার (ডেমো)', '01000000005', 'dmch-respiratory'),
      'demo-d': doctor('demo-d', 'ডা. মাহমুদ রেজা (ডেমো)', '01000000004', 'dmch-surgery', false),
    },
    wards: Object.fromEntries(
      [
        ward('dmch-cardiology', 'open', 12, 3),
        ward('dmch-ccu', 'full', 40),
        ward('dmch-icu', 'emergency', 25, 1),
        ward('dmch-neurology', 'open', 5),
        ward('dmch-medicine', 'emergency', 90),
        ward('dmch-respiratory', 'open', 20, 7),
        ward('dmch-surgery', 'full', 8 * 60),
        ward('dmch-gynae', 'open', 30, 4),
        ward('dmch-orthopedics', 'full', 15),
      ].map((w) => [w.id, w]),
    ),
    transfers: {},
    seededIncoming: [],
  };
}

export function createDemoBackend(): Backend {
  let state: DemoState = load<DemoState | null>(KEY, null) ?? seed();
  const listeners = new Set<() => void>();

  const commit = (next: DemoState) => {
    state = next;
    save(KEY, state);
    listeners.forEach((l) => l());
  };

  const subscribe = (fn: () => void) => {
    listeners.add(fn);
    // Async first emit, like Firestore.
    const t = setTimeout(fn, 0);
    return () => {
      clearTimeout(t);
      listeners.delete(fn);
    };
  };

  const user = (): AuthUser | null => (state.signedIn ? { uid: DEMO_UID, displayName: 'ডেমো ডাক্তার' } : null);

  const patchDoctor = (uid: string, patch: Partial<DoctorProfile>) => {
    const d = state.doctors[uid];
    if (!d) throw new Error('No profile');
    commit({ ...state, doctors: { ...state.doctors, [uid]: { ...d, ...patch } } });
  };

  const putTransfer = (t: Transfer) => commit({ ...state, transfers: { ...state.transfers, [t.id]: t } });

  const newId = () => `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const seedTimers = new Set<string>();

  const setWardStatus = (uid: string, hospitalId: string, wardId: string, status: WardState, freeBeds: number | null) => {
    const prev = state.wards[wardId] ?? { id: wardId, hospitalId };
    commit({
      ...state,
      wards: { ...state.wards, [wardId]: { ...prev, status, freeBeds, updatedAt: Date.now(), updatedByUid: uid } },
    });
  };

  return {
    mode: 'demo',

    onAuth(cb) {
      return subscribe(() => cb(user()));
    },

    async signIn() {
      commit({ ...state, signedIn: true });
    },

    async signOut() {
      commit({ ...state, signedIn: false });
    },

    watchProfile(uid, cb) {
      return subscribe(() => cb(state.doctors[uid] ?? null));
    },

    async saveProfile(uid, input, approved, dutyUntil) {
      commit({ ...state, doctors: { ...state.doctors, [uid]: { uid, ...input, approved, dutyUntil } } });
    },

    async setDuty(uid, dutyUntil) {
      patchDoctor(uid, { dutyUntil });
    },

    watchWards(hospitalId, cb) {
      return subscribe(() => cb(Object.values(state.wards).filter((w) => w.hospitalId === hospitalId)));
    },

    async setWardStatus(uid, hospitalId, wardId, status, freeBeds) {
      setWardStatus(uid, hospitalId, wardId, status, freeBeds);
    },

    async addWard(_uid, hospitalId, nameBn) {
      const id = `custom-${Date.now().toString(36)}`;
      commit({ ...state, wards: { ...state.wards, [id]: { id, hospitalId, nameBn, custom: true } } });
      return id;
    },

    watchOnDutyDoctors(cb) {
      return subscribe(() => {
        const now = Date.now();
        cb(Object.values(state.doctors).filter((d) => d.approved && d.dutyUntil !== null && d.dutyUntil > now));
      });
    },

    async createTransfer(doctor, input) {
      const t: Transfer = {
        id: newId(),
        hospitalId: doctor.hospitalId,
        fromWardId: doctor.wardId,
        fromDoctorUid: doctor.uid,
        fromDoctorName: doctor.name,
        fromDoctorPhone: doctor.phone,
        ...input,
        status: 'pending',
        createdAt: Date.now(),
      };
      putTransfer(t);
      // Simulate the other ward answering.
      setTimeout(() => {
        const cur = state.transfers[t.id];
        if (!cur || cur.status !== 'pending') return;
        const target = state.wards[t.toWardId];
        const responder = Object.values(state.doctors).find((d) => d.wardId === t.toWardId && d.approved);
        putTransfer({
          ...cur,
          status: target?.status === 'full' ? 'rejected' : 'accepted',
          respondedAt: Date.now(),
          respondedByName: responder?.name ?? 'ডিউটি ডাক্তার (ডেমো)',
          respondedByPhone: responder?.phone ?? '01000000009',
        });
      }, 6000);
    },

    watchIncomingTransfers(wardId, cb) {
      // One simulated referral per ward, a few seconds after the doctor first opens the app. The timer
      // isn't tied to this subscription, so a quick unsubscribe/resubscribe doesn't cancel it.
      if (!state.seededIncoming.includes(wardId) && !seedTimers.has(wardId)) {
        seedTimers.add(wardId);
        setTimeout(() => {
          const fromWardId = wardId === 'dmch-cardiology' ? 'dmch-medicine' : 'dmch-cardiology';
          const from = Object.values(state.doctors).find((d) => d.wardId === fromWardId) ?? state.doctors['demo-a'];
          const t: Transfer = {
            id: newId(),
            hospitalId: 'dmch',
            fromWardId,
            toWardId: wardId,
            fromDoctorUid: from.uid,
            fromDoctorName: from.name,
            fromDoctorPhone: from.phone,
            patientNote: 'বুকে ব্যথা, শ্বাসকষ্ট। ইসিজিতে পরিবর্তন আছে।',
            patientInfo: '৪৬–৬০ বছর, পুরুষ',
            status: 'pending',
            createdAt: Date.now(),
          };
          commit({
            ...state,
            transfers: { ...state.transfers, [t.id]: t },
            seededIncoming: [...state.seededIncoming, wardId],
          });
        }, 4000);
      }
      return subscribe(() =>
        cb(Object.values(state.transfers).filter((t) => t.toWardId === wardId && t.status === 'pending')),
      );
    },

    watchSentTransfers(uid, cb) {
      return subscribe(() => cb(Object.values(state.transfers).filter((t) => t.fromDoctorUid === uid)));
    },

    async respondTransfer(doctor, transferId, accept, wardUpdate) {
      const cur = state.transfers[transferId];
      if (!cur) throw new Error('No transfer');
      putTransfer({
        ...cur,
        status: accept ? 'accepted' : 'rejected',
        respondedAt: Date.now(),
        respondedByName: doctor.name,
        respondedByPhone: doctor.phone,
      });
      if (accept && wardUpdate) {
        setWardStatus(doctor.uid, doctor.hospitalId, doctor.wardId, wardUpdate.status, wardUpdate.freeBeds);
      }
    },

    async cancelTransfer(_uid, transferId) {
      const cur = state.transfers[transferId];
      if (cur) putTransfer({ ...cur, status: 'cancelled', respondedAt: Date.now() });
    },

    async isAdmin() {
      return state.signedIn;
    },

    watchAllDoctors(cb) {
      return subscribe(() => cb(Object.values(state.doctors)));
    },

    async adminUpdateDoctor(uid, patch) {
      patchDoctor(uid, patch);
    },

    async deleteDoctor(uid) {
      const doctors = { ...state.doctors };
      delete doctors[uid];
      commit({ ...state, doctors });
    },
  };
}

export function resetDemo(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
