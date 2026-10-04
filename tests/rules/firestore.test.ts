import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;

const ADMIN_EMAIL = 'boss@example.com';

/** A profile as the client writes it (server timestamp). */
const profile = (wardId: string, extra: Record<string, unknown> = {}) => ({
  name: 'ডা. রহিম',
  phone: '01712345678',
  bmdc: 'A-12345',
  hospitalId: 'dmch',
  wardId,
  newWardName: '',
  approved: false,
  dutyUntil: null,
  updatedAt: serverTimestamp(),
  ...extra,
});

/** A profile as stored, for seeding with rules disabled. */
const stored = (wardId: string, extra: Record<string, unknown> = {}) => ({
  ...profile(wardId, extra),
  updatedAt: Timestamp.now(),
});

const db = (uid?: string) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();
const adminDb = () => env.authenticatedContext('boss', { email: ADMIN_EMAIL, email_verified: true }).firestore();

const status = (uid: string, full: boolean) => ({
  hospitalId: 'dmch',
  full,
  updatedAt: serverTimestamp(),
  updatedByUid: uid,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-careq',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const f = ctx.firestore();
    await setDoc(doc(f, 'config/admins'), { emails: [ADMIN_EMAIL] });
    // alice: approved medicine doctor, on duty. pete: pending surgery doctor.
    await setDoc(
      doc(f, 'doctors/alice'),
      stored('dmch-medicine', { approved: true, dutyUntil: Timestamp.fromMillis(Date.now() + 3600_000) }),
    );
    await setDoc(doc(f, 'doctors/pete'), stored('dmch-surgery'));
  });
});

describe('wards', () => {
  it('anyone can read ward status', async () => {
    await assertSucceeds(getDoc(doc(db(), 'wards/dmch-medicine')));
    await assertSucceeds(getDocs(collection(db(), 'wards')));
  });

  it('an approved doctor can set their own ward status', async () => {
    const ref = doc(db('alice'), 'wards/dmch-medicine');
    await assertSucceeds(setDoc(ref, status('alice', true), { merge: true }));
    await assertSucceeds(setDoc(ref, status('alice', false), { merge: true }));
  });

  it("an approved doctor cannot set another ward's status", async () => {
    await assertFails(setDoc(doc(db('alice'), 'wards/dmch-surgery'), status('alice', true)));
  });

  it('a pending doctor cannot set status, even for their own ward', async () => {
    await assertFails(setDoc(doc(db('pete'), 'wards/dmch-surgery'), status('pete', true)));
  });

  it('status writes must carry the server time and the writer uid', async () => {
    const ref = doc(db('alice'), 'wards/dmch-medicine');
    await assertFails(setDoc(ref, { ...status('alice', true), updatedAt: Timestamp.now() }));
    await assertFails(setDoc(ref, status('bob', true)));
  });

  const customWard = (uid: string) => ({
    hospitalId: 'dmch',
    nameBn: 'মেডিসিন ইউনিট ৩',
    custom: true,
    createdByUid: uid,
    createdAt: serverTimestamp(),
  });

  it('approved doctors and admins can add a ward; pending doctors and strangers cannot', async () => {
    await assertSucceeds(setDoc(doc(db('alice'), 'wards/c1'), customWard('alice')));
    await assertSucceeds(setDoc(doc(adminDb(), 'wards/c2'), customWard('boss')));
    await assertFails(setDoc(doc(db('pete'), 'wards/c3'), customWard('pete')));
    await assertFails(setDoc(doc(db('mallory'), 'wards/c4'), customWard('mallory')));
  });

  it('nobody can rename a ward; only admins can delete a doctor-added one', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'wards/c1'), { ...customWard('alice'), createdAt: Timestamp.now() });
    });
    await assertFails(updateDoc(doc(db('alice'), 'wards/c1'), { nameBn: 'অন্য নাম' }));
    await assertFails(deleteDoc(doc(db('alice'), 'wards/c1')));
    await assertSucceeds(deleteDoc(doc(adminDb(), 'wards/c1')));
  });
});

describe('doctors: reading', () => {
  it('patients (signed out) cannot read doctor numbers', async () => {
    await assertFails(getDoc(doc(db(), 'doctors/alice')));
    await assertFails(getDocs(collection(db(), 'doctors')));
  });

  it('pending doctors can read only their own profile', async () => {
    await assertSucceeds(getDoc(doc(db('pete'), 'doctors/pete')));
    await assertFails(getDoc(doc(db('pete'), 'doctors/alice')));
    await assertFails(getDocs(collection(db('pete'), 'doctors')));
  });

  it('approved doctors and admins can list doctors', async () => {
    await assertSucceeds(getDocs(collection(db('alice'), 'doctors')));
    await assertSucceeds(getDocs(collection(adminDb(), 'doctors')));
  });

  it('only listed admins can read the admin list', async () => {
    await assertSucceeds(getDoc(doc(adminDb(), 'config/admins')));
    await assertFails(getDoc(doc(db('alice'), 'config/admins')));
    const unverified = env.authenticatedContext('x', { email: ADMIN_EMAIL, email_verified: false }).firestore();
    await assertFails(getDoc(doc(unverified, 'config/admins')));
    await assertFails(setDoc(doc(adminDb(), 'config/admins'), { emails: ['me@example.com'] }));
  });
});

describe('doctors: registering and editing', () => {
  it('a new doctor registers unapproved, with a listed ward or a requested one', async () => {
    await assertSucceeds(setDoc(doc(db('newdoc'), 'doctors/newdoc'), profile('dmch-icu')));
    await assertSucceeds(
      setDoc(doc(db('newdoc2'), 'doctors/newdoc2'), profile('', { newWardName: 'মেডিসিন ইউনিট ৩' })),
    );
    await assertFails(setDoc(doc(db('newdoc3'), 'doctors/newdoc3'), profile('')));
  });

  it('nobody approves themselves or goes on duty before approval', async () => {
    await assertFails(setDoc(doc(db('newdoc'), 'doctors/newdoc'), profile('dmch-icu', { approved: true })));
    await assertFails(
      updateDoc(doc(db('pete'), 'doctors/pete'), { approved: true, updatedAt: serverTimestamp() }),
    );
    await assertFails(
      updateDoc(doc(db('pete'), 'doctors/pete'), {
        dutyUntil: Timestamp.fromMillis(Date.now() + 3600_000),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('rejects bad phones, missing BMDC, extra fields, and other people’s profiles', async () => {
    const ref = doc(db('newdoc'), 'doctors/newdoc');
    await assertFails(setDoc(ref, profile('dmch-icu', { phone: '12345' })));
    await assertFails(setDoc(ref, profile('dmch-icu', { bmdc: '' })));
    await assertFails(setDoc(ref, profile('dmch-icu', { role: 'admin' })));
    await assertFails(setDoc(doc(db('newdoc'), 'doctors/alice'), profile('dmch-icu')));
  });

  it('an approved doctor keeps approval when changing ward or phone', async () => {
    await assertSucceeds(
      setDoc(doc(db('alice'), 'doctors/alice'), profile('dmch-ccu', { phone: '01812345678', approved: true })),
    );
  });

  it('changing name or BMDC drops approval', async () => {
    const ref = doc(db('alice'), 'doctors/alice');
    await assertFails(setDoc(ref, profile('dmch-medicine', { name: 'অন্য কেউ', approved: true })));
    await assertSucceeds(setDoc(ref, profile('dmch-medicine', { name: 'অন্য কেউ', approved: false })));
  });

  it('duty can be at most ~25 hours ahead', async () => {
    const ref = doc(db('alice'), 'doctors/alice');
    await assertSucceeds(
      updateDoc(ref, { dutyUntil: Timestamp.fromMillis(Date.now() + 12 * 3600_000), updatedAt: serverTimestamp() }),
    );
    await assertFails(
      updateDoc(ref, { dutyUntil: Timestamp.fromMillis(Date.now() + 48 * 3600_000), updatedAt: serverTimestamp() }),
    );
    await assertSucceeds(updateDoc(ref, { dutyUntil: null, updatedAt: serverTimestamp() }));
  });
});

describe('doctors: admin', () => {
  it('admin approves, assigning a ward', async () => {
    await assertSucceeds(updateDoc(doc(adminDb(), 'doctors/pete'), { approved: true, wardId: 'c1', newWardName: '' }));
  });

  it('admin revokes and clears duty', async () => {
    await assertSucceeds(updateDoc(doc(adminDb(), 'doctors/alice'), { approved: false, dutyUntil: null }));
  });

  it('admin cannot change name, phone or BMDC, or set someone on duty', async () => {
    const ref = doc(adminDb(), 'doctors/pete');
    await assertFails(updateDoc(ref, { phone: '01999999999' }));
    await assertFails(updateDoc(ref, { bmdc: 'X-1' }));
    await assertFails(updateDoc(ref, { dutyUntil: Timestamp.fromMillis(Date.now() + 3600_000) }));
  });

  it('only admins (or the doctor) can delete a profile', async () => {
    await assertFails(deleteDoc(doc(db('alice'), 'doctors/pete')));
    await assertSucceeds(deleteDoc(doc(adminDb(), 'doctors/pete')));
  });

  it('a non-admin cannot approve', async () => {
    await assertFails(updateDoc(doc(db('alice'), 'doctors/pete'), { approved: true }));
  });
});
