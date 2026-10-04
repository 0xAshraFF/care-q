import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { Timestamp, collection, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;

const profile = (wardId: string, extra: Record<string, unknown> = {}) => ({
  name: 'ডা. রহিম',
  phone: '01712345678',
  hospitalId: 'dmch',
  wardId,
  dutyUntil: null,
  updatedAt: serverTimestamp(),
  ...extra,
});

const db = (uid?: string) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();

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
  // Seed: alice is a medicine doctor, on duty.
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'doctors/alice'), {
      ...profile('dmch-medicine'),
      dutyUntil: Timestamp.fromMillis(Date.now() + 3600_000),
      updatedAt: Timestamp.now(),
    });
  });
});

describe('wards', () => {
  it('anyone can read ward status', async () => {
    await assertSucceeds(getDoc(doc(db(), 'wards/dmch-medicine')));
    await assertSucceeds(getDocs(collection(db(), 'wards')));
  });

  it('a doctor can set their own ward status', async () => {
    const ref = doc(db('alice'), 'wards/dmch-medicine');
    await assertSucceeds(
      setDoc(ref, { hospitalId: 'dmch', full: true, updatedAt: serverTimestamp(), updatedByUid: 'alice' }, { merge: true }),
    );
    await assertSucceeds(
      setDoc(ref, { hospitalId: 'dmch', full: false, updatedAt: serverTimestamp(), updatedByUid: 'alice' }, { merge: true }),
    );
  });

  it("a doctor cannot set another ward's status", async () => {
    await assertFails(
      setDoc(doc(db('alice'), 'wards/dmch-surgery'), {
        hospitalId: 'dmch',
        full: true,
        updatedAt: serverTimestamp(),
        updatedByUid: 'alice',
      }),
    );
  });

  it('a signed-in user without a profile cannot set status', async () => {
    await assertFails(
      setDoc(doc(db('mallory'), 'wards/dmch-medicine'), {
        hospitalId: 'dmch',
        full: true,
        updatedAt: serverTimestamp(),
        updatedByUid: 'mallory',
      }),
    );
  });

  it('status writes must carry the server time and the writer uid', async () => {
    const ref = doc(db('alice'), 'wards/dmch-medicine');
    await assertFails(setDoc(ref, { hospitalId: 'dmch', full: true, updatedAt: Timestamp.now(), updatedByUid: 'alice' }));
    await assertFails(setDoc(ref, { hospitalId: 'dmch', full: true, updatedAt: serverTimestamp(), updatedByUid: 'bob' }));
  });

  it('a signed-in user can add a ward, but cannot rename one later', async () => {
    const ref = doc(db('newdoc'), 'wards/custom1');
    await assertSucceeds(
      setDoc(ref, {
        hospitalId: 'dmch',
        nameBn: 'মেডিসিন ইউনিট ৩',
        custom: true,
        createdByUid: 'newdoc',
        createdAt: serverTimestamp(),
      }),
    );
    await assertFails(updateDoc(ref, { nameBn: 'অন্য নাম' }));
    await assertFails(
      setDoc(doc(db(), 'wards/custom2'), {
        hospitalId: 'dmch',
        nameBn: 'x ward',
        custom: true,
        createdByUid: 'anon',
        createdAt: serverTimestamp(),
      }),
    );
  });

  it('a doctor of a doctor-added ward can update only its status', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'wards/custom1'), {
        hospitalId: 'dmch',
        nameBn: 'মেডিসিন ইউনিট ৩',
        custom: true,
        createdByUid: 'bob',
        createdAt: Timestamp.now(),
      });
      await setDoc(doc(ctx.firestore(), 'doctors/bob'), { ...profile('custom1'), updatedAt: Timestamp.now() });
    });
    const ref = doc(db('bob'), 'wards/custom1');
    await assertSucceeds(
      setDoc(ref, { hospitalId: 'dmch', full: true, updatedAt: serverTimestamp(), updatedByUid: 'bob' }, { merge: true }),
    );
    await assertFails(
      setDoc(
        ref,
        { full: false, nameBn: 'বদল', updatedAt: serverTimestamp(), updatedByUid: 'bob' },
        { merge: true },
      ),
    );
  });
});

describe('doctors', () => {
  it('patients (signed out) cannot read doctor numbers', async () => {
    await assertFails(getDoc(doc(db(), 'doctors/alice')));
    await assertFails(getDocs(collection(db(), 'doctors')));
  });

  it('a signed-in user without a profile can read only their own (missing) doc', async () => {
    await assertSucceeds(getDoc(doc(db('newdoc'), 'doctors/newdoc')));
    await assertFails(getDoc(doc(db('newdoc'), 'doctors/alice')));
    await assertFails(getDocs(collection(db('newdoc'), 'doctors')));
  });

  it('registered doctors can list on-duty doctors', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'doctors/bob'), { ...profile('dmch-surgery'), updatedAt: Timestamp.now() });
    });
    await assertSucceeds(getDocs(collection(db('bob'), 'doctors')));
  });

  it('a user can create their own profile with a valid phone', async () => {
    await assertSucceeds(setDoc(doc(db('newdoc'), 'doctors/newdoc'), profile('dmch-surgery')));
  });

  it('rejects bad phones, extra fields, and other people’s profiles', async () => {
    await assertFails(setDoc(doc(db('newdoc'), 'doctors/newdoc'), profile('dmch-surgery', { phone: '12345' })));
    await assertFails(setDoc(doc(db('newdoc'), 'doctors/newdoc'), profile('dmch-surgery', { role: 'admin' })));
    await assertFails(setDoc(doc(db('newdoc'), 'doctors/alice'), profile('dmch-surgery')));
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
