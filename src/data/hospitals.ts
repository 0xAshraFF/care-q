// Hospitals and their built-in ward lists.
// Doctors can add their exact unit (e.g. "মেডিসিন ইউনিট ৩") from the app; those live in Firestore.
// To add a hospital later, append to HOSPITALS — the UI shows a hospital picker once there is more than one.

export interface WardDef {
  id: string;
  nameBn: string;
}

export interface Hospital {
  id: string;
  nameBn: string;
  shortBn: string;
  /** Main switchboard / information desk. */
  phone: string;
  phoneVerified: boolean;
  wards: WardDef[];
}

export const HOSPITALS: Hospital[] = [
  {
    id: 'dmch',
    nameBn: 'ঢাকা মেডিকেল কলেজ হাসপাতাল',
    shortBn: 'ঢাকা মেডিকেল',
    // Listed on dmch.gov.bd and WHO SEARO directory as +88 02 55165001.
    phone: '0255165001',
    phoneVerified: false,
    wards: [
      { id: 'dmch-medicine', nameBn: 'মেডিসিন' },
      { id: 'dmch-surgery', nameBn: 'সার্জারি' },
      { id: 'dmch-cardiology', nameBn: 'কার্ডিওলজি' },
      { id: 'dmch-ccu', nameBn: 'সিসিইউ (হৃদরোগ)' },
      { id: 'dmch-icu', nameBn: 'আইসিইউ' },
      { id: 'dmch-neurology', nameBn: 'নিউরোলজি' },
      { id: 'dmch-neurosurgery', nameBn: 'নিউরোসার্জারি' },
      { id: 'dmch-nephrology', nameBn: 'নেফ্রোলজি (কিডনি)' },
      { id: 'dmch-gastro', nameBn: 'গ্যাস্ট্রোএন্টারোলজি' },
      { id: 'dmch-hepatology', nameBn: 'হেপাটোলজি (লিভার)' },
      { id: 'dmch-respiratory', nameBn: 'রেসপিরেটরি মেডিসিন (বক্ষব্যাধি)' },
      { id: 'dmch-endocrinology', nameBn: 'এন্ডোক্রাইনোলজি (হরমোন)' },
      { id: 'dmch-hematology', nameBn: 'হেমাটোলজি (রক্তরোগ)' },
      { id: 'dmch-oncology', nameBn: 'অনকোলজি (ক্যান্সার)' },
      { id: 'dmch-gynae', nameBn: 'গাইনি ও প্রসূতি' },
      { id: 'dmch-pediatrics', nameBn: 'শিশু' },
      { id: 'dmch-pediatric-surgery', nameBn: 'শিশু সার্জারি' },
      { id: 'dmch-neonatology', nameBn: 'নবজাতক' },
      { id: 'dmch-orthopedics', nameBn: 'অর্থোপেডিক্স (হাড়)' },
      { id: 'dmch-urology', nameBn: 'ইউরোলজি' },
      { id: 'dmch-burn', nameBn: 'বার্ন ও প্লাস্টিক সার্জারি' },
      { id: 'dmch-dermatology', nameBn: 'চর্ম ও যৌন' },
      { id: 'dmch-psychiatry', nameBn: 'মানসিক রোগ' },
      { id: 'dmch-ent', nameBn: 'নাক-কান-গলা' },
      { id: 'dmch-eye', nameBn: 'চক্ষু' },
    ],
  },
];

export const DEFAULT_HOSPITAL = HOSPITALS[0];

export function findHospital(id: string | undefined): Hospital | undefined {
  return HOSPITALS.find((h) => h.id === id);
}
