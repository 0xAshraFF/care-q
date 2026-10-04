# CareQ

A small Bengali web app (PWA) for government hospitals in Bangladesh, piloted on Dhaka Medical College Hospital.

- **ওয়ার্ড**: Every ward as a card: 🟢 সিট আছে, 🟡 শুধু ইমার্জেন্সি, 🔴 সিট নেই, or খবর নেই (no news), with when it was last updated and, if the doctor gave one, how many beds are free. Count tiles at the top filter the list, and there's a search box.
- **রক্ত / আইসিইউ / অক্সিজেন**: One page each. One-tap call list first, then a short form that writes a plain-Bengali post to share on WhatsApp or Facebook, or copy.
- **ডাক্তার**: Gmail sign-in. On first use, the doctor enters name, mobile, BMDC number and ward, then waits for an admin to approve them. Once approved:
  - They tap their ward's state (three big buttons). The free-bed count is an optional dropdown.
  - They say they're on duty until a set time; the app logs them out when that time passes.
  - **রোগী রেফার করুন** (refer a patient): pick a ward from a dropdown that already shows 🟢/🟡/🔴 and free beds, see who's on duty there (tap to call), write the problem, pick age and sex, and send. Sending to a full ward is allowed with a warning; that ward's doctor decides.
  - Incoming referrals pop up over any tab with a vibration, and as a phone notification if the app is in the background. The doctor taps গ্রহণ করুন (accept) or সিট নেই (no bed). Accepting takes one bed off the count. The sender sees the answer and the answering doctor's number.
- **Admin** (inside the ডাক্তার tab): a list of doctors waiting for approval, each with a call button so you can check their BMDC number and ward by phone. Approve, reject, or later revoke.

Patients and relatives never sign in. Doctors' phone numbers are visible only to approved doctors. A number appears only while that doctor is on duty and their ward is not marked full. A doctor who is still pending sees exactly what a patient sees.

## Run it

```bash
npm install
npm run dev
```

Without Firebase config, the app runs in **demo mode** with a yellow banner. All data stays in the browser's localStorage, and "ডেমো ডাক্তার হিসেবে ঢুকুন" stands in for Google sign-in. The demo user is also an admin, and one demo doctor is waiting for approval, so the whole approval flow can be clicked through on one device. Referrals are simulated too: a few seconds after you open your ward, a referral arrives from another ward, and any referral you send is answered by a demo doctor about six seconds later.

## Connect Firebase

1. Create a project at <https://console.firebase.google.com> (the free Spark plan is enough).
2. **Build → Authentication → Sign-in method**: enable **Google**.
3. **Build → Firestore Database**: create a database (production mode; region `asia-south1` is closest).
4. **Project settings → Your apps → Web**: register an app and copy the config into `.env` (see `.env.example`).
5. Deploy the security rules: `npx firebase-tools login`, then `npx firebase-tools deploy --only firestore --project <your-project-id>`.
6. **Make yourself an admin.** In **Firestore Database → Data**, start a collection `config`, add a document with ID `admins`, and give it one field: `emails` (type *array*) holding the Gmail address(es) allowed to approve doctors. You can add more admins there later. The app can't edit this list, only the console can.
7. `npm run build`, then `npx firebase-tools deploy --only hosting --project <your-project-id>`.
8. If you host on your own domain, add it under **Authentication → Settings → Authorized domains**.

Apart from `config/admins`, nothing needs seeding. The built-in ward list lives in `src/data/hospitals.ts`. Firestore only stores statuses, wards added on approval, and doctor profiles.

## Before real users see it

- [ ] **Call every number in `src/data/directory.ts`.** They came from web searches and are all marked `verified: false`, which shows a "যাচাই বাকি" tag in the app. Set `verified: true` on numbers that work and delete the ones that don't. Each entry has a `source` field saying where it came from.
- [ ] Confirm the DMCH main number (`phone` in `src/data/hospitals.ts`).
- [ ] Review the DMCH ward list in `src/data/hospitals.ts`. It lists departments only. A doctor whose unit isn't listed (e.g. "মেডিসিন ইউনিট ৩") asks for it when registering, and it's created when you approve them. Approved doctors can add units directly.

## Data model

| Path | Who reads | Who writes |
| --- | --- | --- |
| `wards/{wardId}` `{hospitalId, full, updatedAt, updatedByUid}` (+ `nameBn, custom` for added wards) | everyone | status: approved doctors of that ward only. New wards: approved doctors and admins |
| `doctors/{uid}` `{name, phone, bmdc, hospitalId, wardId, newWardName, approved, dutyUntil}` | that doctor, approved doctors, admins | the doctor (never `approved`); admins only `approved`, `wardId`, `newWardName`, and clearing duty |
| `transfers/{id}` `{fromWardId, toWardId, fromDoctor…, patientNote, patientInfo, status, responded…}` | the sender and approved doctors of the receiving ward | approved doctors send from their own ward; the receiving ward answers once; the sender can cancel; nobody deletes |
| `config/admins` `{emails: []}` | only the admins listed | Firebase console only |

`wards/{wardId}` stores `status` (`open` / `emergency` / `full`) and an optional `freeBeds` (1–10, or 11 meaning "more than 10"; never on a full ward).

The rules live in `firestore.rules`. They also check phone format, require a BMDC number, block going on duty before approval, drop approval if the doctor changes their name or BMDC number, cap shifts at 25 hours, and require server timestamps.

## Tests

```bash
npm test            # formatting, shift times, generated posts, ward merging
npm run test:rules  # security rules against the Firestore emulator (needs Java 21): 30 cases
npm run typecheck
```

GitHub Actions runs all of these on every push and pull request (`.github/workflows/ci.yml`).

## Android

Chrome on Android shows an "অ্যাপ নিন" (install) button in the header, which adds CareQ to the home screen like an app. It works offline with the last-loaded data. If you need a Play Store APK later, wrap the deployed URL with [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) or [PWABuilder](https://www.pwabuilder.com/).

## Layout

```
src/
  data/        hospitals + ward list, phone directory   ← edit these
  lib/         Bengali digits/time, shift maths, post text, share + notification helpers
  backend/     Firebase implementation + localStorage demo
  state/       session, ward list, on-duty doctors, referrals, auto logout
  pages/       ওয়ার্ড, রক্ত/আইসিইউ/অক্সিজেন, ডাক্তার
  components/  header, bottom nav, referral sheet + popup, admin list, share bar
firestore.rules
tests/
```

## Known gaps

- **Referral notifications reach a doctor only while the app is open or recently in the background.** Android suspends background tabs after a while, so a doctor whose app is fully closed won't hear about a referral until they open it; the call button is there for that reason.
- The BMDC number isn't checked against BMDC's register automatically. The admin's phone call is the check.
- One hospital for now. Adding one means appending to `HOSPITALS`, and a hospital picker appears automatically.
- There's no per-ward landline yet. Patients see the hospital's main number.
- ICU and oxygen are call lists only; nobody reports live availability for them.

## Next scope

- **Push notifications when the app is closed.** Firebase Cloud Messaging plus a small Cloud Function that fires when a referral is created and notifies the receiving ward's on-duty doctors. Cloud Functions need the Blaze (pay-as-you-go) plan; at pilot volume it stays inside the free allowance.
- **Leaderboard / weekly winner.** Referrals already record which doctor answered and when. Counting status updates fairly needs an append-only log of updates (today only the latest update per ward is kept), so add that first, then rank by "kept their ward updated" and "answered referrals quickly" rather than raw tap counts, which are easy to game.
