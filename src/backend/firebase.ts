import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
} from 'firebase/auth';
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
} from 'firebase/firestore';
import type { Backend, DoctorProfile, WardDoc } from './types';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

function millis(v: unknown): number | undefined {
  return v instanceof Timestamp ? v.toMillis() : undefined;
}

function toProfile(uid: string, d: DocumentData): DoctorProfile {
  return {
    uid,
    name: d.name,
    phone: d.phone,
    hospitalId: d.hospitalId,
    wardId: d.wardId,
    dutyUntil: millis(d.dutyUntil) ?? null,
  };
}

export function createFirebaseBackend(config: FirebaseConfig): Backend {
  const app = initializeApp(config);
  const auth = getAuth(app);
  // Offline cache: wards keep showing the last known status on a bad connection.
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  return {
    mode: 'firebase',

    onAuth(cb) {
      return onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, displayName: u.displayName } : null));
    },

    async signIn() {
      try {
        await signInWithPopup(auth, provider);
      } catch (e) {
        const code = (e as { code?: string }).code ?? '';
        // Installed PWAs and some in-app browsers block popups; fall back to a full-page redirect.
        if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
          await signInWithRedirect(auth, provider);
          return;
        }
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
        throw e;
      }
    },

    signOut: () => fbSignOut(auth),

    watchProfile(uid, cb, onError) {
      return onSnapshot(
        doc(db, 'doctors', uid),
        (snap) => cb(snap.exists() ? toProfile(uid, snap.data()) : null),
        onError,
      );
    },

    async saveProfile(uid, input, dutyUntil) {
      await setDoc(doc(db, 'doctors', uid), {
        ...input,
        dutyUntil: dutyUntil === null ? null : Timestamp.fromMillis(dutyUntil),
        updatedAt: serverTimestamp(),
      });
    },

    async setDuty(uid, dutyUntil) {
      await updateDoc(doc(db, 'doctors', uid), {
        dutyUntil: dutyUntil === null ? null : Timestamp.fromMillis(dutyUntil),
        updatedAt: serverTimestamp(),
      });
    },

    watchWards(hospitalId, cb, onError) {
      return onSnapshot(
        query(collection(db, 'wards'), where('hospitalId', '==', hospitalId)),
        (snap) =>
          cb(
            snap.docs.map((s): WardDoc => {
              const d = s.data();
              return {
                id: s.id,
                hospitalId: d.hospitalId,
                nameBn: d.nameBn,
                custom: d.custom === true,
                full: typeof d.full === 'boolean' ? d.full : undefined,
                // Pending server timestamps read as null locally; treat as "just now".
                updatedAt: 'updatedAt' in d ? (millis(d.updatedAt) ?? Date.now()) : undefined,
                updatedByUid: d.updatedByUid,
              };
            }),
          ),
        onError,
      );
    },

    async setWardFull(uid, hospitalId, wardId, full) {
      // merge: creates the doc for built-in wards, keeps nameBn on doctor-added wards.
      await setDoc(
        doc(db, 'wards', wardId),
        { hospitalId, full, updatedAt: serverTimestamp(), updatedByUid: uid },
        { merge: true },
      );
    },

    async addWard(uid, hospitalId, nameBn) {
      const ref = await addDoc(collection(db, 'wards'), {
        hospitalId,
        nameBn,
        custom: true,
        createdByUid: uid,
        createdAt: serverTimestamp(),
      });
      return ref.id;
    },

    watchOnDutyDoctors(cb, onError) {
      // Single-field range query: no composite index needed. Callers re-filter with a ticking clock,
      // since a listener doesn't drop docs whose shift ended after it started.
      return onSnapshot(
        query(collection(db, 'doctors'), where('dutyUntil', '>', Timestamp.now())),
        (snap) => cb(snap.docs.map((s) => toProfile(s.id, s.data()))),
        onError,
      );
    },
  };
}
