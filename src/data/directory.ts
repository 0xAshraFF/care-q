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
  /** This provider's own rate, e.g. "সিলিন্ডার ভাড়া ৳৩৫০/দিন". Only fill in from the provider. */
  price?: string;
  /**
   * Google Maps rating, copied by hand from the provider's Maps page, with the review count and the
   * date you copied it. Never estimate these. The app always links to the live Maps page anyway.
   */
  rating?: { stars: number; reviews: number; checked: string };
  /** When set, the card links to this Google Maps search so people can read the live reviews. */
  mapsQuery?: string;
}

/** A price range seen across many providers, shown as a "roughly what it costs" note. */
export interface MarketRate {
  lines: string[];
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
    mapsQuery: 'Peace Oxygen Dhaka',
    source: 'peaceoxygen.com (via web search, Oct 2026)',
  },
  {
    name: 'অক্সিজেন ডেলিভারি বিডি',
    note: 'সিলিন্ডার বাসায় পৌঁছে দেয় · টাকা লাগে',
    phone: '01819644860',
    verified: false,
    mapsQuery: 'Oxygen Delivery BD Dhaka',
    source: 'oxygendeliverybd.com (via web search, Oct 2026)',
  },
  {
    name: 'অক্সিজেন সিলিন্ডার বিডি',
    note: 'সিলিন্ডার ও রিফিল · টাকা লাগে',
    phone: '01712544008',
    verified: false,
    mapsQuery: 'Oxygen Cylinder BD Dhaka',
    source: 'oxygencylinder.com.bd (via web search, Oct 2026)',
  },
  {
    name: 'লাইফ লাইন ইকুইপমেন্ট',
    note: 'সিলিন্ডার · টাকা লাগে',
    phone: '01704727361',
    verified: false,
    mapsQuery: 'Life Line Equipment BD',
    source: 'lifelineequipmentbd.com (via web search, Oct 2026)',
  },
  {
    name: 'বিডিমেডি',
    note: 'কনসেনট্রেটর ভাড়া ও বিক্রি · টাকা লাগে',
    phone: '01711633404',
    verified: false,
    mapsQuery: 'BDMEDI oxygen concentrator Dhaka',
    source: 'oxygenconcentratorbd.com (via web search, Oct 2026)',
  },
];

export const OXYGEN_RATES: MarketRate = {
  lines: ['সিলিন্ডার ভাড়া: ৭ দিন প্রায় ৳২,৫০০, ৩০ দিন প্রায় ৳৫,০০০', 'রিফিল: প্রায় ৳৫০০ থেকে ৳১,০০০ (বাসায় এনে দিলে বেশি)'],
  source: 'ঢাকার অনলাইন বিক্রেতাদের তালিকা, অক্টোবর ২০২৬',
};

export const AMBULANCE_CONTACTS: Contact[] = [
  {
    name: 'আল-মারকাজুল ইসলামী অ্যাম্বুলেন্স',
    note: 'কম খরচের অ্যাম্বুলেন্স সেবা',
    phone: '01818732905',
    verified: false,
    source: 'dmpnews.org 24/7 ambulance list (via web search, Oct 2026)',
    mapsQuery: 'Al-Markazul Islami Ambulance Dhaka',
  },
  {
    name: 'ন্যাশনাল অ্যাম্বুলেন্স',
    note: 'এসি, আইসিইউ অ্যাম্বুলেন্স · টাকা লাগে',
    phone: '01605777755',
    verified: false,
    source: 'nationalambulancebd.com (via web search, Oct 2026)',
    mapsQuery: 'National Ambulance Dhaka',
  },
  {
    name: 'অ্যাম্বুলেন্স বিডি ২৪',
    note: 'এসি, নন-এসি, আইসিইউ · টাকা লাগে',
    phone: '01919339689',
    verified: false,
    source: 'ambulancebd24.com (via web search, Oct 2026)',
    mapsQuery: 'Ambulance BD24 Dhaka',
  },
  {
    name: '২৪ অ্যাম্বুলেন্স',
    note: 'এসি অ্যাম্বুলেন্স · টাকা লাগে',
    phone: '01911125156',
    verified: false,
    source: '24ambulance.com (via web search, Oct 2026)',
    mapsQuery: '24 Ambulance Dhaka',
  },
  {
    name: 'সেবা অ্যাম্বুলেন্স সার্ভিস',
    note: 'টাকা লাগে',
    phone: '01786433932',
    verified: false,
    source: 'sebaambulance.com (via web search, Oct 2026)',
    mapsQuery: 'Seba Ambulance Service Dhaka',
  },
];

export const AMBULANCE_RATES: MarketRate = {
  lines: [
    'ঢাকার ভেতরে সাধারণ বা এসি অ্যাম্বুলেন্স: প্রায় ৳২,০০০ থেকে ৳৪,০০০',
    'আইসিইউ অ্যাম্বুলেন্সে খরচ অনেক বেশি। রওনার আগে ভাড়া ঠিক করে নিন।',
  ],
  source: 'ঢাকার অ্যাম্বুলেন্স সার্ভিসগুলোর ওয়েবসাইট, অক্টোবর ২০২৬',
};
