// Demo backend: everything lives in this browser's localStorage.
// Used when no Firebase config is set, so the app can be clicked through before the project exists.

import { load, save } from '../lib/storage';
import type { AuthUser, Backend, DoctorProfile, WardDoc } from './types';

const KEY = 'careq-demo-v1';
const DEMO_UID = 'demo-doctor';

interface DemoState {
  signedIn: boolean;
  doctors: Record<string, DoctorProfile>;
  wards: Record<string, WardDoc>;
}

function seed(): DemoState {
  const now = Date.now();
  const min = 60_000;
  const ward = (id: string, full: boolean, agoMin: number): WardDoc => ({
    id,
    hospitalId: 'dmch',
    full,
    updatedAt: now - agoMin * min,
    updatedByUid: 'demo-a',
  });
  const doctor = (uid: string, name: string, phone: string, wardId: string): DoctorProfile => ({
    uid,
    name,
    phone,
    hospitalId: 'dmch',
    wardId,
    dutyUntil: now + 6 * 60 * min,
  });
  return {
    signedIn: false,
    doctors: {
      'demo-a': doctor('demo-a', 'ডা. নুসরাত জাহান (ডেমো)', '01700000001', 'dmch-cardiology'),
      'demo-b': doctor('demo-b', 'ডা. তানভীর হাসান (ডেমো)', '01700000002', 'dmch-neurology'),
      'demo-c': doctor('demo-c', 'ডা. সাবরিনা ইসলাম (ডেমো)', '01700000003', 'dmch-medicine'),
    },
    wards: Object.fromEntries(
      [
        ward('dmch-cardiology', false, 12),
        ward('dmch-ccu', true, 40),
        ward('dmch-icu', true, 25),
        ward('dmch-neurology', false, 5),
        ward('dmch-medicine', false, 90),
        ward('dmch-surgery', true, 8 * 60),
        ward('dmch-gynae', false, 30),
      ].map((w) => [w.id, w]),
    ),
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

    async saveProfile(uid, input, dutyUntil) {
      commit({ ...state, doctors: { ...state.doctors, [uid]: { uid, ...input, dutyUntil } } });
    },

    async setDuty(uid, dutyUntil) {
      const d = state.doctors[uid];
      if (!d) throw new Error('No profile');
      commit({ ...state, doctors: { ...state.doctors, [uid]: { ...d, dutyUntil } } });
    },

    watchWards(hospitalId, cb) {
      return subscribe(() => cb(Object.values(state.wards).filter((w) => w.hospitalId === hospitalId)));
    },

    async setWardFull(uid, hospitalId, wardId, full) {
      const prev = state.wards[wardId] ?? { id: wardId, hospitalId };
      commit({
        ...state,
        wards: { ...state.wards, [wardId]: { ...prev, full, updatedAt: Date.now(), updatedByUid: uid } },
      });
    },

    async addWard(_uid, hospitalId, nameBn) {
      const id = `custom-${Date.now().toString(36)}`;
      commit({ ...state, wards: { ...state.wards, [id]: { id, hospitalId, nameBn, custom: true } } });
      return id;
    },

    watchOnDutyDoctors(cb) {
      return subscribe(() => {
        const now = Date.now();
        cb(Object.values(state.doctors).filter((d) => d.dutyUntil !== null && d.dutyUntil > now));
      });
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
