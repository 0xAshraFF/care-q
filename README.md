# CareQ

A small Bengali web app (PWA) for government hospitals in Bangladesh, piloted on Dhaka Medical College Hospital.

- **ওয়ার্ড**: Pick a ward and see whether it has beds: সিট আছে / সিট নেই / খবর নেই, with the time it was last updated. Doctors keep this current. A referring doctor checks it before sending a patient across the hospital.
- **রক্ত / আইসিইউ / অক্সিজেন**: One-tap call lists, plus a short form that writes a plain-Bengali post to share on WhatsApp or Facebook, or copy.
- **ডাক্তার**: Gmail sign-in. On first use, the doctor enters name, mobile and ward. They mark their ward's status with one tap. They can say they're on duty until a set time, and the app logs them out when that time passes.

Patients and relatives never sign in. Doctors' phone numbers are visible only to other signed-in doctors. A number appears only while that doctor is on duty and their ward is not marked full.

## Run it

```bash
npm install
npm run dev
```

Without Firebase config, the app runs in **demo mode** with a yellow banner. All data stays in the browser's localStorage, and "ডেমো ডাক্তার হিসেবে ঢুকুন" stands in for Google sign-in. Use it to click through every screen.

## Connect Firebase

1. Create a project at <https://console.firebase.google.com> (the free Spark plan is enough).
2. **Build → Authentication → Sign-in method**: enable **Google**.
3. **Build → Firestore Database**: create a database (production mode; region `asia-south1` is closest).
4. **Project settings → Your apps → Web**: register an app and copy the config into `.env` (see `.env.example`).
5. Deploy the security rules: `npx firebase-tools login`, then `npx firebase-tools deploy --only firestore --project <your-project-id>`.
6. `npm run build`, then `npx firebase-tools deploy --only hosting --project <your-project-id>`.
7. If you host on your own domain, add it under **Authentication → Settings → Authorized domains**.

No collections need seeding. The built-in ward list lives in `src/data/hospitals.ts`. Firestore only stores statuses, wards that doctors add, and doctor profiles.

## Before real users see it

- [ ] **Call every number in `src/data/directory.ts`.** They came from web searches and are all marked `verified: false`, which shows a "যাচাই বাকি" tag in the app. Set `verified: true` on numbers that work and delete the ones that don't. Each entry has a `source` field saying where it came from.
- [ ] Confirm the DMCH main number (`phone` in `src/data/hospitals.ts`).
- [ ] Review the DMCH ward list in `src/data/hospitals.ts`. It lists departments only. Doctors add their exact unit (e.g. "মেডিসিন ইউনিট ৩") from the app the first time they sign in.

## Data model

| Path | Who reads | Who writes |
| --- | --- | --- |
| `wards/{wardId}` `{hospitalId, full, updatedAt, updatedByUid}` (+ `nameBn, custom` for doctor-added wards) | everyone | only doctors whose profile is on that ward, and only the status fields |
| `doctors/{uid}` `{name, phone, hospitalId, wardId, dutyUntil}` | other registered doctors | only that doctor |

The rules live in `firestore.rules`. They also check phone format, cap shifts at 25 hours, and require server timestamps.

## Tests

```bash
npm test            # formatting, shift times, generated posts, ward merging
npm run test:rules  # security rules against the Firestore emulator (needs Java 11+)
npm run typecheck
```

## Android

Chrome on Android shows an "অ্যাপ নিন" (install) button in the header, which adds CareQ to the home screen like an app. It works offline with the last-loaded data. If you need a Play Store APK later, wrap the deployed URL with [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) or [PWABuilder](https://www.pwabuilder.com/).

## Layout

```
src/
  data/        hospitals + ward list, phone directory   ← edit these
  lib/         Bengali digits/time, shift maths, post text, share helpers
  backend/     Firebase implementation + localStorage demo
  state/       session, ward list, on-duty doctors, auto logout
  pages/       ওয়ার্ড, রক্ত/আইসিইউ/অক্সিজেন, ডাক্তার
  components/  header, bottom nav, share bar, call lists
firestore.rules
tests/
```

## Known gaps

- **Anyone with a Gmail account can register as a doctor.** Before a wide rollout, add a check: a BMDC number plus manual approval, or an allowlist of emails.
- One hospital for now. Adding one means appending to `HOSPITALS`, and a hospital picker appears automatically.
- There's no per-ward landline yet. Patients see the hospital's main number.
- ICU and oxygen are call lists only; nobody reports live availability for them.
