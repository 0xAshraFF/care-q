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
  deleteDoc,
  doc,
  getDoc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import type { Backend, DoctorProfile, Transfer, WardDoc, WardState } from './types';

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
    bmdc: d.bmdc ?? '',
    hospitalId: d.hospitalId,
    wardId: d.wardId ?? '',
    newWardName: d.newWardName ?? '',
    approved: d.approved === true,
    dutyUntil: millis(d.dutyUntil) ?? null,
  };
}

const ts = (ms: number | null) => (ms === null ? null : Timestamp.fromMillis(ms));

const WARD_STATES: WardState[] = ['open', 'emergency', 'full'];

function toTransfer(id: string, d: DocumentData): Transfer {
  return {
    id,
    hospitalId: d.hospitalId,
    fromWardId: d.fromWardId,
    toWardId: d.toWardId,
    fromDoctorUid: d.fromDoctorUid,
    fromDoctorName: d.fromDoctorName,
    fromDoctorPhone: d.fromDoctorPhone,
    patientNote: d.patientNote,
    patientInfo: d.patientInfo ?? '',
    status: d.status,
    // Pending server timestamps read as null locally; treat as "just now".
    createdAt: millis(d.createdAt) ?? Date.now(),
    respondedAt: millis(d.respondedAt),
    respondedByName: d.respondedByName,
    respondedByPhone: d.respondedByPhone,
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

    async saveProfile(uid, input, approved, dutyUntil) {
      await setDoc(doc(db, 'doctors', uid), {
        ...input,
        approved,
        dutyUntil: ts(dutyUntil),
        updatedAt: serverTimestamp(),
      });
    },

    async setDuty(uid, dutyUntil) {
      await updateDoc(doc(db, 'doctors', uid), { dutyUntil: ts(dutyUntil), updatedAt: serverTimestamp() });
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
                status: WARD_STATES.includes(d.status) ? d.status : undefined,
                freeBeds: typeof d.freeBeds === 'number' ? d.freeBeds : null,
                // Pending server timestamps read as null locally; treat as "just now".
                updatedAt: 'updatedAt' in d ? (millis(d.updatedAt) ?? Date.now()) : undefined,
                updatedByUid: d.updatedByUid,
              };
            }),
          ),
        onError,
      );
    },

    async setWardStatus(uid, hospitalId, wardId, status, freeBeds) {
      // merge: creates the doc for built-in wards, keeps nameBn on doctor-added wards.
      await setDoc(
        doc(db, 'wards', wardId),
        { hospitalId, status, freeBeds, updatedAt: serverTimestamp(), updatedByUid: uid },
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
        (snap) => cb(snap.docs.map((s) => toProfile(s.id, s.data())).filter((d) => d.approved)),
        onError,
      );
    },

    async createTransfer(doctor, input) {
      await addDoc(collection(db, 'transfers'), {
        hospitalId: doctor.hospitalId,
        fromWardId: doctor.wardId,
        toWardId: input.toWardId,
        fromDoctorUid: doctor.uid,
        fromDoctorName: doctor.name,
        fromDoctorPhone: doctor.phone,
        patientNote: input.patientNote,
        patientInfo: input.patientInfo,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
    },

    watchIncomingTransfers(wardId, cb, onError) {
      // Equality filters only, so no composite index is needed; callers sort and drop old ones.
      return onSnapshot(
        query(collection(db, 'transfers'), where('toWardId', '==', wardId), where('status', '==', 'pending')),
        (snap) => cb(snap.docs.map((s) => toTransfer(s.id, s.data()))),
        onError,
      );
    },

    watchSentTransfers(uid, cb, onError) {
      return onSnapshot(
        query(collection(db, 'transfers'), where('fromDoctorUid', '==', uid)),
        (snap) => cb(snap.docs.map((s) => toTransfer(s.id, s.data()))),
        onError,
      );
    },

    async respondTransfer(doctor, transferId, accept, wardUpdate) {
      const batch = writeBatch(db);
      batch.update(doc(db, 'transfers', transferId), {
        status: accept ? 'accepted' : 'rejected',
        respondedAt: serverTimestamp(),
        respondedByUid: doctor.uid,
        respondedByName: doctor.name,
        respondedByPhone: doctor.phone,
      });
      if (accept && wardUpdate) {
        batch.set(
          doc(db, 'wards', doctor.wardId),
          { hospitalId: doctor.hospitalId, ...wardUpdate, updatedAt: serverTimestamp(), updatedByUid: doctor.uid },
          { merge: true },
        );
      }
      await batch.commit();
    },

    async cancelTransfer(_uid, transferId) {
      await updateDoc(doc(db, 'transfers', transferId), { status: 'cancelled', respondedAt: serverTimestamp() });
    },

    async isAdmin() {
      // The rules only let admins read this doc, so a successful read is the answer.
      try {
        return (await getDoc(doc(db, 'config', 'admins'))).exists();
      } catch {
        return false;
      }
    },

    watchAllDoctors(cb, onError) {
      return onSnapshot(
        collection(db, 'doctors'),
        (snap) => cb(snap.docs.map((s) => toProfile(s.id, s.data()))),
        onError,
      );
    },

    async adminUpdateDoctor(uid, patch) {
      await updateDoc(doc(db, 'doctors', uid), { ...patch });
    },

    async deleteDoctor(uid) {
      await deleteDoc(doc(db, 'doctors', uid));
    },
  };
}
