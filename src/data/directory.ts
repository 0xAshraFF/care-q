// Phone directory for the Blood, ICU and Oxygen tabs.
//
// BEFORE LAUNCH: call every number marked `verified: false`. If it works, set `verified: true`
// (the "যাচাই বাকি" tag disappears). If it doesn't, delete the entry. A wrong number in an
// emergency costs minutes, so unverified entries are shown with a visible tag.
//
// Old 7-digit Dhaka landlines (e.g. 9668690) were left out on purpose: Dhaka moved to
// 8-digit numbers, so those are most likely dead.

export interface Contact {
  name: string;
  /** Short line under the name: hours, what to ask for, paid/free. */
  note?: string;
  /** Dialable number: 11-digit mobile, 02 + 8-digit landline, or a short code. */
  phone: string;
  verified: boolean;
  /** Where the number came from (for whoever verifies it). Not shown in the app. */
  source: string;
}

/** National numbers shown at the top of every section. Well-established, widely published. */
export const NATIONAL: Contact[] = [
  {
    name: 'জাতীয় জরুরি সেবা',
    note: 'অ্যাম্বুলেন্স, পুলিশ, ফায়ার সার্ভিস · ২৪ ঘণ্টা',
    phone: '999',
    verified: true,
    source: 'Government of Bangladesh national emergency number',
  },
  {
    name: 'স্বাস্থ্য বাতায়ন',
    note: 'ডাক্তারের পরামর্শ ও হাসপাতালের তথ্য · ২৪ ঘণ্টা',
    phone: '16263',
    verified: true,
    source: 'DGHS health call centre',
  },
];

export const BLOOD_CONTACTS: Contact[] = [
  {
    name: 'পুলিশ ব্লাড ব্যাংক, রাজারবাগ',
    note: 'জরুরি হটলাইন · সবার জন্য',
    phone: '01320037333',
    verified: false,
    source: 'dmp.gov.bd/police-blood-bank (via web search, Oct 2026)',
  },
  {
    name: 'রেড ক্রিসেন্ট ব্লাড সেন্টার, মোহাম্মদপুর',
    note: 'হটলাইন',
    phone: '01811458537',
    verified: false,
    source: 'bdrcs.org/donate-blood (via web search, Oct 2026)',
  },
  {
    name: 'রেড ক্রিসেন্ট রক্ত হটলাইন',
    note: 'সকাল ৯টা – বিকাল ৫টা',
    phone: '01811458524',
    verified: false,
    source: 'bdrcs.org/donate-blood (via web search, Oct 2026); also in the old AI Studio handoff',
  },
  {
    name: 'কোয়ান্টাম ল্যাব, শান্তিনগর',
    note: 'স্বেচ্ছা রক্তদান কার্যক্রম',
    phone: '01617826886',
    verified: false,
    source: 'Business directory listing (vymaps.com) — low confidence',
  },
  {
    name: 'ঢাকা মেডিকেল কলেজ হাসপাতাল',
    note: 'মূল নম্বর · ব্লাড ব্যাংকে দিতে বলুন',
    phone: '0255165001',
    verified: false,
    source: 'dmch.gov.bd / WHO SEARO directory',
  },
];

export const ICU_CONTACTS: Contact[] = [
  {
    name: 'ঢাকা মেডিকেল কলেজ হাসপাতাল',
    note: 'আইসিইউ',
    phone: '0255165015',
    verified: false,
    source: 'daktarachen.com hospital list (via web search, Oct 2026)',
  },
  {
    name: 'কুর্মিটোলা জেনারেল হাসপাতাল',
    note: 'জরুরি বিভাগ',
    phone: '0255062350',
    verified: false,
    source: 'Hospital listing (via web search, Oct 2026)',
  },
  {
    name: 'শহীদ সোহরাওয়ার্দী মেডিকেল কলেজ হাসপাতাল',
    note: 'মূল নম্বর · আইসিইউতে দিতে বলুন',
    phone: '0255026708',
    verified: false,
    source: 'Hospital listing (via web search, Oct 2026)',
  },
  {
    name: 'বারডেম হাসপাতাল, শাহবাগ',
    note: 'আইসিইউ হটলাইন · বেসরকারি খরচ',
    phone: '0241060483',
    verified: false,
    source: 'daktarachen.com hospital list (via web search, Oct 2026)',
  },
  {
    name: 'ঢাকা শিশু হাসপাতাল, শেরেবাংলা নগর',
    note: 'শিশু ও নবজাতক আইসিইউ · মূল নম্বর',
    phone: '0248110117',
    verified: false,
    source: 'Hospital listing (via web search, Oct 2026)',
  },
];

export const OXYGEN_CONTACTS: Contact[] = [
  {
    name: 'পিস অক্সিজেন',
    note: 'সিলিন্ডার বাসায় পৌঁছে দেয় · টাকা লাগে',
    phone: '01719677350',
    verified: false,
    source: 'peaceoxygen.com (via web search, Oct 2026)',
  },
  {
    name: 'অক্সিজেন ডেলিভারি বিডি',
    note: 'সিলিন্ডার বাসায় পৌঁছে দেয় · টাকা লাগে',
    phone: '01819644860',
    verified: false,
    source: 'oxygendeliverybd.com (via web search, Oct 2026)',
  },
  {
    name: 'অক্সিজেন সিলিন্ডার বিডি',
    note: 'সিলিন্ডার ও রিফিল · টাকা লাগে',
    phone: '01712544008',
    verified: false,
    source: 'oxygencylinder.com.bd (via web search, Oct 2026)',
  },
  {
    name: 'লাইফ লাইন ইকুইপমেন্ট',
    note: 'সিলিন্ডার · টাকা লাগে',
    phone: '01704727361',
    verified: false,
    source: 'lifelineequipmentbd.com (via web search, Oct 2026)',
  },
  {
    name: 'বিডিমেডি',
    note: 'কনসেনট্রেটর ভাড়া ও বিক্রি · টাকা লাগে',
    phone: '01711633404',
    verified: false,
    source: 'oxygenconcentratorbd.com (via web search, Oct 2026)',
  },
];
