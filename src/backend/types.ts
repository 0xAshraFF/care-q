export type Unsub = () => void;

export interface AuthUser {
  uid: string;
  displayName: string | null;
}

export interface DoctorProfile {
  uid: string;
  name: string;
  /** 11-digit BD mobile, English digits. Only signed-in doctors can read it. */
  phone: string;
  hospitalId: string;
  wardId: string;
  /** Epoch ms when the doctor's shift ends; null when not on duty. */
  dutyUntil: number | null;
}

export type ProfileInput = Omit<DoctorProfile, 'uid' | 'dutyUntil'>;

/** A doc in /wards. Built-in wards only have status fields; doctor-added wards also carry a name. */
export interface WardDoc {
  id: string;
  hospitalId: string;
  nameBn?: string;
  custom?: boolean;
  full?: boolean;
  updatedAt?: number;
  updatedByUid?: string;
}

export interface Backend {
  mode: 'firebase' | 'demo';

  onAuth(cb: (user: AuthUser | null) => void): Unsub;
  signIn(): Promise<void>;
  signOut(): Promise<void>;

  watchProfile(uid: string, cb: (p: DoctorProfile | null) => void, onError: (e: Error) => void): Unsub;
  saveProfile(uid: string, input: ProfileInput, dutyUntil: number | null): Promise<void>;
  setDuty(uid: string, dutyUntil: number | null): Promise<void>;

  watchWards(hospitalId: string, cb: (docs: WardDoc[]) => void, onError: (e: Error) => void): Unsub;
  setWardFull(uid: string, hospitalId: string, wardId: string, full: boolean): Promise<void>;
  addWard(uid: string, hospitalId: string, nameBn: string): Promise<string>;

  /** Doctors whose shift hasn't ended. Requires a signed-in doctor. */
  watchOnDutyDoctors(cb: (docs: DoctorProfile[]) => void, onError: (e: Error) => void): Unsub;
}
