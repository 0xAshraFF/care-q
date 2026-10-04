// Builds the plain-Bengali posts people share on Facebook / WhatsApp.
// Phone numbers stay in English digits so they can be tapped or pasted into a dialer.

import { normalizeBdMobile, toBnDigits } from './bn';

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export const WHEN_OPTIONS = ['এখনই', 'আজকেই', 'আগামীকাল'] as const;
export type When = (typeof WHEN_OPTIONS)[number];

export interface BloodRequest {
  group: BloodGroup | '';
  bags: number;
  when: When;
  problem: string;
  hospital: string;
  ward: string;
  phone: string;
}

export const ICU_TYPES = ['আইসিইউ', 'সিসিইউ', 'এইচডিইউ', 'এনআইসিইউ (নবজাতক)', 'পিআইসিইউ (শিশু)'] as const;
export type IcuType = (typeof ICU_TYPES)[number];

export interface IcuRequest {
  type: IcuType;
  age: string;
  problem: string;
  location: string;
  phone: string;
}

export const OXYGEN_TYPES = ['অক্সিজেন সিলিন্ডার', 'অক্সিজেন কনসেনট্রেটর', 'অক্সিজেনসহ অ্যাম্বুলেন্স'] as const;
export type OxygenType = (typeof OXYGEN_TYPES)[number];

export interface OxygenRequest {
  type: OxygenType;
  age: string;
  address: string;
  phone: string;
}

function lines(...parts: (string | false | null | undefined)[]): string {
  return parts.filter((p): p is string => typeof p === 'string').join('\n');
}

function clean(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

function ageLine(age: string): string | false {
  const a = clean(age);
  return a !== '' && `রোগীর বয়স: ${toBnDigits(a)} বছর`;
}

export function bloodMessage(r: BloodRequest): string {
  const problem = clean(r.problem);
  const ward = clean(r.ward);
  return lines(
    `জরুরি ${r.group} রক্ত প্রয়োজন`,
    '',
    `রক্তের গ্রুপ: ${r.group}`,
    `পরিমাণ: ${toBnDigits(r.bags)} ব্যাগ`,
    `কখন: ${r.when}`,
    problem !== '' && `রোগীর সমস্যা: ${problem}`,
    `হাসপাতাল: ${clean(r.hospital)}`,
    ward !== '' && `ওয়ার্ড/বেড: ${ward}`,
    `যোগাযোগ: ${normalizeBdMobile(r.phone)}`,
    '',
    'দয়া করে শেয়ার করুন। একজনের জীবন বাঁচতে পারে।',
  );
}

export function icuMessage(r: IcuRequest): string {
  const problem = clean(r.problem);
  return lines(
    `জরুরি ${r.type} বেড প্রয়োজন`,
    '',
    ageLine(r.age),
    problem !== '' && `রোগীর সমস্যা: ${problem}`,
    `রোগী এখন আছেন: ${clean(r.location)}`,
    `যোগাযোগ: ${normalizeBdMobile(r.phone)}`,
    '',
    'কোথাও খালি সিটের খোঁজ জানলে দয়া করে এই নম্বরে জানান।',
  );
}

export function oxygenMessage(r: OxygenRequest): string {
  return lines(
    `জরুরি ${r.type} প্রয়োজন`,
    '',
    ageLine(r.age),
    `ঠিকানা: ${clean(r.address)}`,
    `যোগাযোগ: ${normalizeBdMobile(r.phone)}`,
    '',
    'কারো কাছে থাকলে বা খোঁজ জানলে দয়া করে এই নম্বরে জানান।',
  );
}
