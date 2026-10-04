import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getBackend, type Backend } from '../backend';
import type { AuthUser, DoctorProfile, WardDoc } from '../backend/types';
import { findHospital } from '../data/hospitals';
import { useNow } from '../lib/hooks';

export type WardStatus = 'open' | 'full' | 'unknown';

export interface WardView {
  id: string;
  hospitalId: string;
  nameBn: string;
  custom: boolean;
  status: WardStatus;
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
  isDoctor: boolean;
  toast: (msg: string) => void;
  endDutyAndSignOut: () => Promise<void>;
}

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
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const now = useNow(30_000);

  useEffect(() => {
    let off: (() => void) | undefined;
    let cancelled = false;
    getBackend().then((b) => {
      if (cancelled) return;
      setBackend(b);
      off = b.onAuth((u) => {
        setUser(u);
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
      isDoctor: Boolean(user && profile),
      toast,
      endDutyAndSignOut,
    }),
    [backend, now, authReady, user, profile, toast, endDutyAndSignOut],
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
  const status = (d: WardDoc | undefined): Pick<WardView, 'status' | 'updatedAt' | 'updatedByUid'> => ({
    status: d?.full === true ? 'full' : d?.full === false ? 'open' : 'unknown',
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

/** On-duty doctors, live. Empty for patients (they're not allowed to read doctor numbers). */
export function useOnDutyDoctors(): DoctorProfile[] {
  const { backend, isDoctor, now } = useApp();
  const [docs, setDocs] = useState<DoctorProfile[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!backend || !isDoctor) {
      setDocs([]);
      return;
    }
    // Right after registering, the profile may not have reached the server yet, so the rules
    // reject this query. A rejected listener is dead; retry shortly instead of staying empty.
    let retry: ReturnType<typeof setTimeout> | undefined;
    const off = backend.watchOnDutyDoctors(setDocs, () => {
      setDocs([]);
      retry = setTimeout(() => setAttempt((a) => a + 1), Math.min(3000 * 2 ** attempt, 60_000));
    });
    return () => {
      clearTimeout(retry);
      off();
    };
  }, [backend, isDoctor, attempt]);

  return useMemo(() => docs.filter((d) => d.dutyUntil !== null && d.dutyUntil > now), [docs, now]);
}

export { mergeWards };
