# CareQ

A small Bengali web app (PWA) for government hospitals in Bangladesh, piloted on Dhaka Medical College Hospital.

On first launch the app asks **who you are**:

- **রোগী বা স্বজন (patient or relative)**: no login. Four tabs: রক্ত, আইসিইউ, অক্সিজেন, অ্যাম্বুলেন্স (blood, ICU, oxygen, ambulance).
  - Each tab is one page: tap-to-call numbers, an approximate-cost note where known, a short form that writes a plain-Bengali post to share on WhatsApp or Facebook (blood, ICU, oxygen), and a few "জেনে রাখুন" (good to know) points.
  - Oxygen and ambulance cards link to the provider's live Google reviews.
  - The blood form shows which groups a patient can receive.
- **ডাক্তার বা ওয়ার্ড ইনচার্জ (doctor or ward in-charge)**: sign up or log in with Gmail.
  - **Sign up** asks for name, mobile, role (doctor or ward in-charge) and ward, then waits for approval: a doctor by their ward's in-charge, an in-charge by the app admin.
  - **Home is the ward list.** Your own ward sits at the top with three one-tap status buttons (সিট আছে / শুধু ইমার্জেন্সি / সিট নেই) and one-tap "ডিউটি শুরু" (start duty) to the usual shift end. Below, every ward shows its status, free beds if given, and when it was updated, with a **রেফার** button on each card.
  - **Refer** with taps only: pick reasons from chips, urgency, and age and sex from dropdowns. Free text is optional. Sending to a full ward is allowed with a warning.
  - The receiving ward gets a popup (and a phone notification if the app is in the background) and taps গ্রহণ করুন (accept) or সিট নেই (no bed). Accepting takes one bed off the count.
  - **আমার** (mine): duty and shift end (auto logout when it passes), full status with optional free-bed count, incoming and sent referrals, and for in-charges the approval list for their ward's doctors.
  - **সেবা** (services): the four patient pages, for when a doctor needs them.
- **App admin** (you; your Gmail goes in `config/admins`): approves ward in-charges, and anyone asking for a ward that isn't in the list yet.

Doctors' phone numbers are visible only to approved doctors, and only while that doctor is on duty and their ward isn't marked full. A doctor who is still pending sees exactly what a patient sees.

## Run it

```bash
npm install
npm run dev
```

Without Firebase config, the app runs in **demo mode** with a yellow banner. All data stays in the browser's localStorage, and the sign-up button skips Gmail. Approvals and referrals are simulated so every flow works on one device:
- Your sign-up is approved about 5 seconds later. If you signed up as an in-charge, a doctor of your ward then asks to join, so you can approve them.
- A referral arrives a few seconds after you open your ward, and referrals you send are answered about 6 seconds later.

## Connect Firebase

1. Create a project at <https://console.firebase.google.com> (the free Spark plan is enough).
2. **Build → Authentication → Sign-in method**: enable **Google**.
3. **Build → Firestore Database**: create a database (production mode; region `asia-south1` is closest).
4. **Project settings → Your apps → Web**: register an app and copy the config into `.env` (see `.env.example`).
5. Deploy the security rules: `npx firebase-tools login`, then `npx firebase-tools deploy --only firestore --project <your-project-id>`.
6. **Make yourself the app admin.** In **Firestore Database → Data**, start a collection `config`, add a document with ID `admins`, and give it one field: `emails` (type *array*) holding your Gmail address. The app admin approves ward in-charges; in-charges then approve their own ward's doctors. The app can't edit this list, only the console can.
7. `npm run build`, then `npx firebase-tools deploy --only hosting --project <your-project-id>`.
8. If you host on your own domain, add it under **Authentication → Settings → Authorized domains**.

Apart from `config/admins`, nothing needs seeding. The built-in ward list lives in `src/data/hospitals.ts`. Firestore only stores statuses, wards added on approval, and doctor profiles.

## Before real users see it

- [ ] **Call every number in `src/data/directory.ts`.** They came from web searches and are all marked `verified: false`, which shows a "যাচাই বাকি" tag in the app. Set `verified: true` on numbers that work and delete the ones that don't. Each entry has a `source` field saying where it came from.
- [ ] **Ratings and prices (optional).** Each oxygen and ambulance entry links to its Google Maps page, so people always see the live rating. To also show stars on the card, copy them from Maps into `rating: { stars, reviews, checked }`. To show a provider's own rate, ask them and fill `price`. Never estimate either; the "আনুমানিক খরচ" note (`OXYGEN_RATES`, `AMBULANCE_RATES`) is a market range from sellers' listings, labeled as such.
- [ ] Confirm the DMCH main number (`phone` in `src/data/hospitals.ts`).
- [ ] Review the DMCH ward list in `src/data/hospitals.ts`. It lists departments only. A doctor whose unit isn't listed (e.g. "মেডিসিন ইউনিট ৩") asks for it when registering, and it's created when you approve them. Approved doctors can add units directly.

## Data model

| Path | Who reads | Who writes |
| --- | --- | --- |
| `wards/{wardId}` `{hospitalId, full, updatedAt, updatedByUid}` (+ `nameBn, custom` for added wards) | everyone | status: approved doctors of that ward only. New wards: approved doctors and admins |
| `doctors/{uid}` `{name, phone, role, hospitalId, wardId, newWardName, approved, dutyUntil}` | that doctor, approved doctors, the app admin | the doctor (never `approved`); the ward's in-charge only `approved` / clearing duty, for doctors of that ward; the app admin also `wardId` / `newWardName` |
| `transfers/{id}` `{fromWardId, toWardId, fromDoctor…, patientNote, patientInfo, status, responded…}` | the sender and approved doctors of the receiving ward | approved doctors send from their own ward; the receiving ward answers once; the sender can cancel; nobody deletes |
| `config/admins` `{emails: []}` | only the admins listed | Firebase console only |

`wards/{wardId}` stores `status` (`open` / `emergency` / `full`) and an optional `freeBeds` (1–10, or 11 meaning "more than 10"; never on a full ward).

The rules live in `firestore.rules`. They also check phone format, block going on duty before approval, drop approval if the doctor changes their name, role or ward, stop in-charges from approving other in-charges or other wards, cap shifts at 25 hours, and require server timestamps.

## Tests

```bash
npm test            # formatting, shift times, generated posts, ward merging
npm run test:rules  # security rules against the Firestore emulator (needs Java 21): 34 cases
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
  pages/       welcome, ওয়ার্ড (doctor home), সেবা, রক্ত/আইসিইউ/অক্সিজেন/অ্যাম্বুলেন্স, আমার
  components/  header, bottom nav, referral sheet + popup, admin list, share bar
firestore.rules
tests/
```

## Known gaps

- **Referral notifications reach a doctor only while the app is open or recently in the background.** Android suspends background tabs after a while, so a doctor whose app is fully closed won't hear about a referral until they open it; the call button is there for that reason.
- Identity rests on people who know each other: the ward in-charge vouches for their doctors, the app admin for in-charges. Nothing checks a medical registration.
- One hospital for now. Adding one means appending to `HOSPITALS`, and a hospital picker appears automatically.
- There's no per-ward landline yet. Patients see the hospital's main number.
- ICU and oxygen are call lists only; nobody reports live availability for them.

## Next scope

- **Push notifications when the app is closed.** Firebase Cloud Messaging plus a small Cloud Function that fires when a referral is created and notifies the receiving ward's on-duty doctors. Cloud Functions need the Blaze (pay-as-you-go) plan; at pilot volume it stays inside the free allowance.
- **Leaderboard / weekly winner.** Referrals already record which doctor answered and when. Counting status updates fairly needs an append-only log of updates (today only the latest update per ward is kept), so add that first, then rank by "kept their ward updated" and "answered referrals quickly" rather than raw tap counts, which are easy to game.
