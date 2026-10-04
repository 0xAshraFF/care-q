export type Unsub = () => void;

export interface AuthUser {
  uid: string;
  displayName: string | null;
}

export interface DoctorProfile {
  uid: string;
  name: string;
  /** 11-digit BD mobile, English digits. Only approved doctors and admins can read it. */
  phone: string;
  /** BMDC registration number, as typed (English digits). Checked by an admin before approval. */
  bmdc: string;
  hospitalId: string;
  /** '' while the doctor is waiting for a ward they asked to be added (see newWardName). */
  wardId: string;
  /** Ward the doctor asked for that isn't in the list yet; created by the admin on approval. */
  newWardName: string;
  /** Set only by an admin. Unapproved doctors see what patients see. */
  approved: boolean;
  /** Epoch ms when the doctor's shift ends; null when not on duty. */
  dutyUntil: number | null;
}

export type ProfileInput = Pick<DoctorProfile, 'name' | 'phone' | 'bmdc' | 'hospitalId' | 'wardId' | 'newWardName'>;

/** Changes an admin may make to someone else's profile. */
export interface AdminPatch {
  approved?: boolean;
  wardId?: string;
  newWardName?: string;
  dutyUntil?: null;
}

/** What a ward doctor reports. */
export type WardState = 'open' | 'emergency' | 'full';

/** A doc in /wards. Built-in wards only have status fields; doctor-added wards also carry a name. */
export interface WardDoc {
  id: string;
  hospitalId: string;
  nameBn?: string;
  custom?: boolean;
  status?: WardState;
  /** Optional free-bed count; null when the doctor didn't give one. 11 means "more than 10". */
  freeBeds?: number | null;
  updatedAt?: number;
  updatedByUid?: string;
}

export type TransferStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

/** A referral from one ward's doctor to another ward. */
export interface Transfer {
  id: string;
  hospitalId: string;
  fromWardId: string;
  toWardId: string;
  fromDoctorUid: string;
  fromDoctorName: string;
  fromDoctorPhone: string;
  /** Problem / why the patient needs that ward. */
  patientNote: string;
  /** Optional age and sex, free text. */
  patientInfo: string;
  status: TransferStatus;
  createdAt: number;
  respondedAt?: number;
  respondedByName?: string;
  respondedByPhone?: string;
}

export type TransferInput = Pick<Transfer, 'toWardId' | 'patientNote' | 'patientInfo'>;

export interface Backend {
  mode: 'firebase' | 'demo';

  onAuth(cb: (user: AuthUser | null) => void): Unsub;
  signIn(): Promise<void>;
  signOut(): Promise<void>;

  watchProfile(uid: string, cb: (p: DoctorProfile | null) => void, onError: (e: Error) => void): Unsub;
  /** Writes the doctor's own profile. `approved` must be false unless the doctor already was approved. */
  saveProfile(uid: string, input: ProfileInput, approved: boolean, dutyUntil: number | null): Promise<void>;
  setDuty(uid: string, dutyUntil: number | null): Promise<void>;

  watchWards(hospitalId: string, cb: (docs: WardDoc[]) => void, onError: (e: Error) => void): Unsub;
  setWardStatus(uid: string, hospitalId: string, wardId: string, status: WardState, freeBeds: number | null): Promise<void>;
  /** Approved doctors and admins only. */
  addWard(uid: string, hospitalId: string, nameBn: string): Promise<string>;

  /** Approved doctors on shift. Requires an approved doctor. */
  watchOnDutyDoctors(cb: (docs: DoctorProfile[]) => void, onError: (e: Error) => void): Unsub;

  /** Sends a referral from the doctor's own ward. */
  createTransfer(doctor: DoctorProfile, input: TransferInput): Promise<void>;
  /** Pending referrals to this ward. */
  watchIncomingTransfers(wardId: string, cb: (t: Transfer[]) => void, onError: (e: Error) => void): Unsub;
  /** Referrals this doctor sent. */
  watchSentTransfers(uid: string, cb: (t: Transfer[]) => void, onError: (e: Error) => void): Unsub;
  /**
   * Accept or decline a referral to the doctor's ward. On accept, `wardUpdate` (if given) is written
   * in the same batch, e.g. one fewer free bed.
   */
  respondTransfer(
    doctor: DoctorProfile,
    transferId: string,
    accept: boolean,
    wardUpdate?: { status: WardState; freeBeds: number | null },
  ): Promise<void>;
  cancelTransfer(uid: string, transferId: string): Promise<void>;

  /** True when the signed-in user's Gmail is listed in config/admins. */
  isAdmin(): Promise<boolean>;
  watchAllDoctors(cb: (docs: DoctorProfile[]) => void, onError: (e: Error) => void): Unsub;
  adminUpdateDoctor(uid: string, patch: AdminPatch): Promise<void>;
  deleteDoctor(uid: string): Promise<void>;
}
