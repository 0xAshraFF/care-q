// End-to-end test of the real Firebase code path against the local emulators.
// Run with: npm run test:e2e  (starts the auth + Firestore emulators, then this script)
//
// Five people, each in their own browser: the app admin, a medicine in-charge, a medicine doctor,
// a cardiology doctor, and a patient. Sign-in uses the emulator-only shortcut
// (window.__careqEmulatorSignIn) because Google's popup needs apis.google.com; everything after
// sign-in is the code real users run, under the real security rules.

import { chromium } from 'playwright';
import { createServer } from 'vite';

const PROJECT = 'demo-careq';
const FS = `http://127.0.0.1:8080`;
const AUTH = `http://127.0.0.1:9099`;
const PORT = 5175;
const APP = `http://localhost:${PORT}/`;
const TIMEOUT = 15_000;

let failures = 0;
const check = (ok, what) => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${what}`);
  if (!ok) failures++;
};
const step = (s) => console.log(`\n${s}`);

async function resetEmulators() {
  await fetch(`${FS}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  // config/admins can only be written from the console; "Bearer owner" bypasses rules in the emulator.
  const res = await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/config/admins`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { emails: { arrayValue: { values: [{ stringValue: 'admin@example.com' }] } } } }),
  });
  if (!res.ok) throw new Error(`seeding config/admins failed: ${res.status}`);
}

async function person(browser, label) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Dhaka' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(TIMEOUT);
  page.on('pageerror', (e) => {
    console.log(`  ! ${label} page error: ${e.message}`);
    failures++;
  });
  return page;
}

const has = (page, text) => page.getByText(text, { exact: false }).first().waitFor().then(() => true, () => false);
const tab = (page, name) => page.locator('nav').getByRole('button', { name, exact: true });

async function signInAsDoctor(page, email, name) {
  await page.goto(APP);
  await page.getByRole('button', { name: /ডাক্তার বা ওয়ার্ড ইনচার্জ/ }).click();
  await page.getByText('আগে সাইন আপ করেছেন?').waitFor();
  await page.waitForFunction(() => typeof window.__careqEmulatorSignIn === 'function');
  await page.evaluate(([e, n]) => window.__careqEmulatorSignIn(e, n), [email, name]);
}

async function signUp(page, { email, name, phone, role, ward }) {
  await signInAsDoctor(page, email, name);
  await page.locator('#doc-name').waitFor();
  await page.fill('#doc-name', name);
  await page.fill('#doc-phone', phone);
  await page.getByRole('button', { name: role, exact: true }).click();
  await page.selectOption('#doc-ward', ward);
  await page.getByRole('button', { name: 'জমা দিন' }).click();
}

async function main() {
  await resetEmulators();
  process.env.VITE_FIREBASE_EMULATOR = '1';
  const server = await createServer({ server: { port: PORT, strictPort: true }, logLevel: 'error' });
  await server.listen();
  const browser = await chromium.launch();

  try {
    const admin = await person(browser, 'admin');
    const rina = await person(browser, 'rina');
    const babu = await person(browser, 'babu');
    const cara = await person(browser, 'cara');
    const patient = await person(browser, 'patient');

    step('1. A ward in-charge signs up and waits for the app admin');
    await signUp(rina, {
      email: 'rina@example.com',
      name: 'ডা. রিনা',
      phone: '01711111111',
      role: 'ওয়ার্ড ইনচার্জ',
      ward: 'dmch-medicine',
    });
    check(await has(rina, 'অ্যাপ অ্যাডমিন ফোনে নিশ্চিত হয়ে অনুমোদন দেবেন'), 'in-charge sees "the app admin will approve"');
    check(!(await tab(rina, 'ওয়ার্ড').count()), 'pending in-charge has no ward tab');

    step('2. The app admin (Gmail in config/admins) approves the in-charge');
    await signInAsDoctor(admin, 'admin@example.com', 'অ্যাডমিন');
    check(await has(admin, 'অ্যাপ অ্যাডমিন'), 'app admin lands on the approval list');
    check(await has(admin, 'ডা. রিনা'), 'admin sees the pending in-charge');
    await admin.locator('li', { hasText: 'ডা. রিনা' }).getByRole('button', { name: 'অনুমোদন দিন' }).click();
    check(await has(admin, 'এখন কেউ অপেক্ষায় নেই'), 'pending list is empty after approving');

    step('3. The in-charge is let in without reloading');
    await tab(rina, 'ওয়ার্ড').waitFor().catch(() => {});
    check((await tab(rina, 'ওয়ার্ড').count()) === 1, 'in-charge now has the ward tab (live update)');
    check(await has(rina, 'আপনার ওয়ার্ড'), 'home shows "your ward" strip');

    step('4. A doctor of the same ward signs up; the in-charge approves them');
    await signUp(babu, {
      email: 'babu@example.com',
      name: 'ডা. বাবু',
      phone: '01722222222',
      role: 'ডাক্তার',
      ward: 'dmch-medicine',
    });
    check(await has(babu, 'ইনচার্জ অনুমোদন দেবেন'), 'doctor sees "your in-charge will approve"');
    await tab(rina, 'আমার').click();
    check(await has(rina, 'ডা. বাবু'), 'in-charge sees the pending doctor of their ward');
    await rina.locator('li', { hasText: 'ডা. বাবু' }).getByRole('button', { name: 'অনুমোদন দিন' }).click();
    await tab(babu, 'ওয়ার্ড').waitFor().catch(() => {});
    check((await tab(babu, 'ওয়ার্ড').count()) === 1, 'doctor approved by the in-charge');

    step('5. A cardiology doctor (no in-charge yet) is approved by the app admin');
    await signUp(cara, {
      email: 'cara@example.com',
      name: 'ডা. কারা',
      phone: '01733333333',
      role: 'ডাক্তার',
      ward: 'dmch-cardiology',
    });
    await tab(admin, 'আমার').click();
    check(await has(admin, 'ডা. কারা'), 'admin sees the cardiology doctor');
    await admin.locator('li', { hasText: 'ডা. কারা' }).getByRole('button', { name: 'অনুমোদন দিন' }).click();
    await tab(cara, 'ওয়ার্ড').waitFor().catch(() => {});
    check((await tab(cara, 'ওয়ার্ড').count()) === 1, 'cardiology doctor approved');
    check(!(await rina.getByText('ডা. কারা').count()), "in-charge doesn't see other wards' doctors");

    step('6. Cardiology goes on duty and reports beds');
    await cara.getByRole('button', { name: /ডিউটি শুরু/ }).click();
    await cara.locator('section', { hasText: 'আপনার ওয়ার্ড' }).getByRole('button', { name: 'সিট আছে' }).click();
    check(await has(cara, 'ডিউটিতে আছেন'), 'cardiology doctor is on duty');
    await tab(cara, 'আমার').click();
    await cara.locator('#my-ward-beds').selectOption('3');
    check(await has(cara, 'জানানো হয়েছে: ৩ বেড খালি'), 'free-bed count saved (3)');
    await tab(cara, 'ওয়ার্ড').click();

    step('7. The medicine doctor sees it and refers a patient with taps only');
    const cardio = babu.locator('li', { hasText: 'কার্ডিওলজি' }).first();
    await cardio.getByText('সিট আছে').waitFor();
    check(true, 'medicine doctor sees cardiology as সিট আছে (live)');
    await cardio.getByRole('button', { name: /রেফার/ }).click();
    const sheet = babu.getByRole('dialog');
    check(await has(sheet, 'ডা. কারা'), "refer sheet shows the on-duty cardiology doctor's number");
    await sheet.getByRole('button', { name: 'বুকে ব্যথা / হার্ট' }).click();
    await sheet.getByRole('button', { name: 'খুব জরুরি' }).click();
    await sheet.locator('#refer-age').selectOption({ index: 8 });
    await sheet.locator('#refer-sex').selectOption('পুরুষ');
    await sheet.getByRole('button', { name: /পাঠান/ }).click();

    step('8. Cardiology gets the popup and accepts');
    const popup = cara.getByRole('dialog');
    check(await has(popup, 'নতুন রেফার অনুরোধ'), 'referral pops up for the cardiology doctor');
    check(await has(popup, 'খুব জরুরি'), 'urgency shows on the request');
    await popup.getByRole('button', { name: 'গ্রহণ করুন' }).click();

    check(await has(cara, 'গ্রহণ করেছেন। পাঠানো ডাক্তার জানতে পারবেন।'), 'accept saved');
    check(
      await cara
        .locator('section', { hasText: 'আপনার ওয়ার্ড' })
        .waitFor()
        .then(() => has(babu.locator('li', { hasText: 'কার্ডিওলজি' }).first(), '২ বেড খালি')),
      'accepting took one bed off (3 → 2), seen live by the sender',
    );

    step('9. The sender sees the answer, and can cancel a pending one');
    await tab(babu, 'আমার').click();
    check(await has(babu, 'গ্রহণ করেছেন'), 'sender sees "accepted"');
    await babu.getByRole('button', { name: 'রোগী রেফার করুন' }).click();
    const sheet2 = babu.getByRole('dialog');
    await sheet2.locator('#refer-ward').selectOption('dmch-cardiology');
    await sheet2.getByRole('button', { name: 'শ্বাসকষ্ট' }).click();
    await sheet2.getByRole('button', { name: /পাঠান/ }).click();
    await cara.getByRole('dialog').getByRole('button', { name: 'পরে দেখব' }).click().catch(() => {});
    check(await has(babu, 'উত্তরের অপেক্ষায়'), 'second referral is pending');
    await babu.getByRole('button', { name: 'অনুরোধ বাতিল করুন' }).click();
    check(await has(babu, 'বাতিল করেছেন'), 'sender cancelled it');

    step('9b. Editing your own profile: phone keeps approval, ward change sends it back');
    await babu.getByRole('button', { name: /তথ্য বদলান/ }).click();
    await babu.fill('#doc-phone', '01744444444');
    await babu.getByRole('button', { name: 'সেভ করুন' }).click();
    check(await has(babu, 'সেভ হয়েছে'), 'phone change saved');
    check((await tab(babu, 'ওয়ার্ড').count()) === 1, 'still approved after a phone change');
    await babu.getByRole('button', { name: /তথ্য বদলান/ }).click();
    await babu.selectOption('#doc-ward', 'dmch-surgery');
    check(await has(babu, 'আবার অনুমোদন লাগবে'), 'form warns that a ward change needs new approval');
    await babu.getByRole('button', { name: 'সেভ করুন' }).click();
    check(await has(babu, 'অনুমোদনের অপেক্ষায়'), 'pending again after changing ward');

    step('10. A patient sees only the patient services');
    await patient.goto(APP);
    await patient.getByRole('button', { name: /রোগী বা স্বজন/ }).click();
    const tabs = (await patient.locator('nav li').allInnerTexts()).map((t) => t.trim()).join(' | ');
    check(tabs === 'রক্ত | আইসিইউ | অক্সিজেন | অ্যাম্বুলেন্স', `patient tabs: ${tabs}`);

    step('11. Logging out lands on the login screen');
    await tab(babu, 'আমার').click();
    await babu.getByRole('button', { name: /লগ আউট/ }).click();
    check(await has(babu, 'আগে সাইন আপ করেছেন?'), 'login screen after logout');
  } finally {
    await browser.close();
    await server.close();
  }

  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
