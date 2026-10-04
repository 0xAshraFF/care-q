import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getBackend, type Backend } from '../backend';
import type { AuthUser, DoctorProfile, Transfer, Unsub, WardDoc } from '../backend/types';
import { findHospital } from '../data/hospitals';
import { useNow, useStoredState } from '../lib/hooks';

export type WardStatus = 'open' | 'emergency' | 'full' | 'unknown';

export interface WardView {
  id: string;
  hospitalId: string;
  nameBn: string;
  custom: boolean;
  status: WardStatus;
  /** Optional, only when the ward's doctor gave one. 11 means "more than 10". */
  freeBeds: number | null;
  updatedAt?: number;
  updatedByUid?: string;
}

/** Status older than this gets a "call to confirm" warning. */
export const STALE_AFTER_MS = 6 * 60 * 60_000;

interface AppState {
  backend: Backend | null;
  now: number;
  authReady: boolean;
  user: AuthUser | null;
  /** undefined while loading, null when signed in but not registered yet. */
  profile: DoctorProfile | null | undefined;
  /** Registered and approved. Pending doctors are treated like patients. */
  isDoctor: boolean;
  /** Approved ward in-charge: approves doctors of their own ward. */
  isIncharge: boolean;
  /** The app owner (Gmail listed in config/admins): approves in-charges, and anyone asking for a new ward. */
  isSuperAdmin: boolean;
  /** False until the admin check for the signed-in user has finished. */
  adminChecked: boolean;
  /** What this device chose on the welcome screen; null before the first choice. */
  mode: Mode | null;
  setMode: (m: Mode | null) => void;
  toast: (msg: string) => void;
  endDutyAndSignOut: () => Promise<void>;
}

export type Mode = 'patient' | 'doctor';

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | void> {
  return Promise.race([p, new Promise<void>((r) => setTimeout(r, ms))]);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [backend, setBackend] = useState<Backend | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<DoctorProfile | null | undefined>(undefined);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [mode, setMode] = useStoredState<Mode | null>('careq-mode', null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const now = useNow(30_000);

  useEffect(() => {
    let off: (() => void) | undefined;
    let cancelled = false;
    getBackend().then((b) => {
      if (cancelled) return;
      setBackend(b);
      off = b.onAuth((u) => {
        // Keep the same object for the same user so profile/admin listeners don't restart.
        setUser((prev) => (prev?.uid === u?.uid && prev?.displayName === u?.displayName ? prev : u));
        setAuthReady(true);
      });
    });
    return () => {
      cancelled = true;
      off?.();
    };
  }, []);

  useEffect(() => {
    if (!backend || !user) {
      setProfile(user ? undefined : null);
      return;
    }
    setProfile(undefined);
    return backend.watchProfile(user.uid, setProfile, () => setProfile(null));
  }, [backend, user]);

  useEffect(() => {
    setIsSuperAdmin(null);
    if (!backend || !user) return;
    let cancelled = false;
    backend.isSuperAdmin().then((a) => !cancelled && setIsSuperAdmin(a));
    return () => {
      cancelled = true;
    };
  }, [backend, user]);

  // Whoever signs in on this phone is a doctor here; logging out then lands on the login screen.
  useEffect(() => {
    if (user && mode !== 'doctor') setMode('doctor');
  }, [user, mode, setMode]);

  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3500);
  }, []);

  const endDutyAndSignOut = useCallback(async () => {
    if (!backend || !user) return;
    // Clear duty first so other doctors stop seeing this number, but don't hang on a bad connection:
    // the on-duty query already hides shifts that have ended.
    await withTimeout(backend.setDuty(user.uid, null).catch(() => undefined), 4000);
    await backend.signOut();
  }, [backend, user]);

  // Shift over → sign out on this device. Also catches an app opened the morning after.
  const expiredHandled = useRef<string | null>(null);
  useEffect(() => {
    if (!profile || profile.dutyUntil === null || profile.dutyUntil > now) return;
    const key = `${profile.uid}:${profile.dutyUntil}`;
    if (expiredHandled.current === key) return;
    expiredHandled.current = key;
    endDutyAndSignOut().then(() => toast('ডিউটির সময় শেষ। লগ আউট করা হয়েছে।'));
  }, [profile, now, endDutyAndSignOut, toast]);

  const value = useMemo<AppState>(
    () => ({
      backend,
      now,
      authReady,
      user,
      profile,
      isDoctor: Boolean(user && profile?.approved),
      isIncharge: Boolean(user && profile?.approved && profile.role === 'incharge'),
      isSuperAdmin: isSuperAdmin === true,
      adminChecked: !user || isSuperAdmin !== null,
      mode,
      setMode,
      toast,
      endDutyAndSignOut,
    }),
    [backend, now, authReady, user, profile, isSuperAdmin, mode, setMode, toast, endDutyAndSignOut],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {toastMsg && (
        <div role="status" className="toast">
          {toastMsg}
        </div>
      )}
    </Ctx.Provider>
  );
}

function mergeWards(hospitalId: string, docs: WardDoc[]): WardView[] {
  const hospital = findHospital(hospitalId);
  const byId = new Map(docs.map((d) => [d.id, d]));
  const status = (d: WardDoc | undefined): Pick<WardView, 'status' | 'freeBeds' | 'updatedAt' | 'updatedByUid'> => ({
    status: d?.status ?? 'unknown',
    freeBeds: d?.status && d.status !== 'full' ? (d.freeBeds ?? null) : null,
    updatedAt: d?.updatedAt,
    updatedByUid: d?.updatedByUid,
  });

  const builtIn: WardView[] = (hospital?.wards ?? []).map((w) => ({
    id: w.id,
    hospitalId,
    nameBn: w.nameBn,
    custom: false,
    ...status(byId.get(w.id)),
  }));
  const added: WardView[] = docs
    .filter((d) => d.custom && d.nameBn)
    .map((d) => ({ id: d.id, hospitalId, nameBn: d.nameBn!, custom: true, ...status(d) }));

  return [...builtIn, ...added].sort((a, b) => a.nameBn.localeCompare(b.nameBn, 'bn'));
}

export function useWards(hospitalId: string) {
  const { backend } = useApp();
  const [docs, setDocs] = useState<WardDoc[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!backend) return;
    setLoaded(false);
    return backend.watchWards(
      hospitalId,
      (d) => {
        setDocs(d);
        setLoaded(true);
        setError(false);
      },
      () => setError(true),
    );
  }, [backend, hospitalId]);

  const wards = useMemo(() => mergeWards(hospitalId, docs), [hospitalId, docs]);
  return { wards, loaded, error };
}

type Listen<T> = (cb: (v: T[]) => void, onError: (e: Error) => void) => Unsub;

/**
 * A live list that restarts itself after an error. Right after approval, the doctor's profile may
 * not have reached the server yet, so the rules reject the query; a rejected listener is dead.
 * `listen` is null when there's nothing to watch. `key` changes when the query changes.
 */
function useRetryingList<T>(listen: Listen<T> | null, key: string): T[] {
  const [items, setItems] = useState<T[]>([]);
  const [attempt, setAttempt] = useState(0);
  const listenRef = useRef(listen);
  listenRef.current = listen;
  const active = listen !== null;

  useEffect(() => {
    const start = listenRef.current;
    if (!start) {
      setItems([]);
      return;
    }
    let retry: ReturnType<typeof setTimeout> | undefined;
    const off = start(setItems, () => {
      setItems([]);
      retry = setTimeout(() => setAttempt((a) => a + 1), Math.min(3000 * 2 ** attempt, 60_000));
    });
    return () => {
      clearTimeout(retry);
      off();
    };
  }, [active, key, attempt]);

  return items;
}

/** On-duty doctors, live. Empty for patients (they're not allowed to read doctor numbers). */
export function useOnDutyDoctors(): DoctorProfile[] {
  const { backend, isDoctor, now } = useApp();
  const docs = useRetryingList<DoctorProfile>(
    backend && isDoctor ? (cb, err) => backend.watchOnDutyDoctors(cb, err) : null,
    'on-duty',
  );
  return useMemo(() => docs.filter((d) => d.dutyUntil !== null && d.dutyUntil > now), [docs, now]);
}

/** Pending referrals older than this stop popping up and drop off the list. */
export const REFERRAL_TTL_MS = 6 * 60 * 60_000;

/** Pending referrals to the signed-in doctor's ward, newest first. */
export function useIncomingTransfers(): Transfer[] {
  const { backend, isDoctor, profile, now } = useApp();
  const wardId = isDoctor && profile ? profile.wardId : '';
  const items = useRetryingList<Transfer>(
    backend && wardId ? (cb, err) => backend.watchIncomingTransfers(wardId, cb, err) : null,
    `in:${wardId}`,
  );
  return useMemo(
    () => items.filter((t) => now - t.createdAt < REFERRAL_TTL_MS).sort((a, b) => b.createdAt - a.createdAt),
    [items, now],
  );
}

/** Referrals the signed-in doctor sent in the last 24 hours, newest first. */
export function useSentTransfers(): Transfer[] {
  const { backend, isDoctor, user, now } = useApp();
  const uid = isDoctor && user ? user.uid : '';
  const items = useRetryingList<Transfer>(
    backend && uid ? (cb, err) => backend.watchSentTransfers(uid, cb, err) : null,
    `out:${uid}`,
  );
  return useMemo(
    () => items.filter((t) => now - t.createdAt < 24 * 60 * 60_000).sort((a, b) => b.createdAt - a.createdAt),
    [items, now],
  );
}

export { mergeWards };
