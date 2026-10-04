import { useState, type ReactNode } from 'react';
import { ContactList } from '../components/ContactList';
import { ShareBar } from '../components/ShareBar';
import { ChipGroup, Field, PageTitle, Segmented } from '../components/ui';
import { BLOOD_CONTACTS, ICU_CONTACTS, OXYGEN_CONTACTS, type Contact } from '../data/directory';
import { DEFAULT_HOSPITAL } from '../data/hospitals';
import { isValidBdMobile, toBnDigits, toEnDigits } from '../lib/bn';
import { useStoredState } from '../lib/hooks';
import {
  BLOOD_GROUPS,
  ICU_TYPES,
  OXYGEN_TYPES,
  WHEN_OPTIONS,
  bloodMessage,
  icuMessage,
  oxygenMessage,
  type BloodGroup,
  type IcuType,
  type OxygenType,
  type When,
} from '../lib/messages';

type Tab = 'call' | 'post';

function ResourcePage({
  id,
  title,
  subtitle,
  contacts,
  tip,
  form,
}: {
  id: string;
  title: string;
  subtitle: string;
  contacts: Contact[];
  tip: string;
  form: ReactNode;
}) {
  const [tab, setTab] = useStoredState<Tab>(`careq-tab-${id}`, 'call');
  return (
    <>
      <PageTitle title={title} subtitle={subtitle} />
      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { id: 'call', label: 'ফোন করুন' },
          { id: 'post', label: 'পোস্ট বানান' },
        ]}
      />
      {tab === 'call' ? <ContactList contacts={contacts} tip={tip} /> : form}
    </>
  );
}

// Shared fields — the contact number and hospital are remembered on this phone, since the same
// relative usually makes several posts.

function PhoneField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="যোগাযোগের মোবাইল নম্বর" htmlFor="post-phone">
      <input
        id="post-phone"
        className="input tabular-nums"
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder="01XXXXXXXXX"
        value={value}
        onChange={(e) => onChange(toEnDigits(e.target.value))}
      />
    </Field>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: 'numeric' | 'text';
}) {
  return (
    <Field label={label} htmlFor={id}>
      <input
        id={id}
        className="input"
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

const PHONE_MISSING = 'সঠিক মোবাইল নম্বর দিন (01 দিয়ে শুরু, ১১ সংখ্যা)।';

function BloodForm() {
  const [group, setGroup] = useState<BloodGroup | ''>('');
  const [bags, setBags] = useState(1);
  const [when, setWhen] = useState<When>('আজকেই');
  const [problem, setProblem] = useState('');
  const [hospital, setHospital] = useStoredState('careq-post-hospital', DEFAULT_HOSPITAL.nameBn);
  const [ward, setWard] = useState('');
  const [phone, setPhone] = useStoredState('careq-post-phone', '');

  const missing =
    group === ''
      ? 'রক্তের গ্রুপ বেছে নিন।'
      : hospital.trim() === ''
        ? 'হাসপাতালের নাম দিন।'
        : !isValidBdMobile(phone)
          ? PHONE_MISSING
          : null;

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="label">রক্তের গ্রুপ</legend>
        <div className="grid grid-cols-4 gap-2">
          {BLOOD_GROUPS.map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={g === group}
              onClick={() => setGroup(g)}
              className="chip min-h-13 rounded-xl text-[19px] font-semibold"
            >
              {g}
            </button>
          ))}
        </div>
      </fieldset>
      <ChipGroup label="কত ব্যাগ" options={[1, 2, 3, 4]} value={bags} onChange={setBags} render={(n) => `${toBnDigits(n)} ব্যাগ`} />
      <ChipGroup label="কখন লাগবে" options={WHEN_OPTIONS} value={when} onChange={setWhen} />
      <TextField id="blood-problem" label="রোগীর সমস্যা (না দিলেও চলবে)" placeholder="যেমন: সিজার, ডেঙ্গু, অপারেশন" value={problem} onChange={setProblem} />
      <TextField id="blood-hospital" label="হাসপাতাল" value={hospital} onChange={setHospital} />
      <TextField id="blood-ward" label="ওয়ার্ড ও বেড (না দিলেও চলবে)" placeholder="যেমন: মেডিসিন, বেড ১২" value={ward} onChange={setWard} />
      <PhoneField value={phone} onChange={setPhone} />
      <ShareBar
        missing={missing}
        text={bloodMessage({ group: group || ('?' as BloodGroup), bags, when, problem, hospital, ward, phone })}
      />
    </div>
  );
}

function IcuForm() {
  const [type, setType] = useState<IcuType>('আইসিইউ');
  const [age, setAge] = useState('');
  const [problem, setProblem] = useState('');
  const [location, setLocation] = useStoredState('careq-post-hospital', DEFAULT_HOSPITAL.nameBn);
  const [phone, setPhone] = useStoredState('careq-post-phone', '');

  const missing = location.trim() === '' ? 'রোগী এখন কোথায় আছেন লিখুন।' : !isValidBdMobile(phone) ? PHONE_MISSING : null;

  return (
    <div className="space-y-5">
      <ChipGroup label="কোন বেড লাগবে" options={ICU_TYPES} value={type} onChange={setType} />
      <TextField id="icu-age" label="রোগীর বয়স (না দিলেও চলবে)" inputMode="numeric" placeholder="যেমন: ৬৫" value={age} onChange={setAge} />
      <TextField id="icu-problem" label="রোগীর সমস্যা (না দিলেও চলবে)" placeholder="যেমন: স্ট্রোক, শ্বাসকষ্ট" value={problem} onChange={setProblem} />
      <TextField id="icu-location" label="রোগী এখন কোথায় আছেন" value={location} onChange={setLocation} />
      <PhoneField value={phone} onChange={setPhone} />
      <ShareBar missing={missing} text={icuMessage({ type, age, problem, location, phone })} />
    </div>
  );
}

function OxygenForm() {
  const [type, setType] = useState<OxygenType>('অক্সিজেন সিলিন্ডার');
  const [age, setAge] = useState('');
  const [address, setAddress] = useStoredState('careq-post-address', '');
  const [phone, setPhone] = useStoredState('careq-post-phone', '');

  const missing = address.trim() === '' ? 'কোথায় লাগবে, ঠিকানা লিখুন।' : !isValidBdMobile(phone) ? PHONE_MISSING : null;

  return (
    <div className="space-y-5">
      <ChipGroup label="কী লাগবে" options={OXYGEN_TYPES} value={type} onChange={setType} />
      <TextField id="oxy-age" label="রোগীর বয়স (না দিলেও চলবে)" inputMode="numeric" placeholder="যেমন: ৭০" value={age} onChange={setAge} />
      <TextField id="oxy-address" label="ঠিকানা" placeholder="যেমন: মিরপুর ১০, ঢাকা" value={address} onChange={setAddress} />
      <PhoneField value={phone} onChange={setPhone} />
      <ShareBar missing={missing} text={oxygenMessage({ type, age, address, phone })} />
    </div>
  );
}

export function BloodPage() {
  return (
    <ResourcePage
      id="blood"
      title="রক্ত লাগবে?"
      subtitle="ব্লাড ব্যাংকে ফোন করুন, অথবা পোস্ট বানিয়ে Facebook, WhatsApp-এ দিন।"
      contacts={BLOOD_CONTACTS}
      tip="ব্লাড ব্যাংকে গেলে ডাক্তারের লেখা রক্তের রিকুইজিশন স্লিপ সাথে নিন।"
      form={<BloodForm />}
    />
  );
}

export function IcuPage() {
  return (
    <ResourcePage
      id="icu"
      title="আইসিইউ খুঁজছেন?"
      subtitle="হাসপাতালে সরাসরি ফোন করুন, অথবা পোস্ট দিয়ে সবাইকে জানান।"
      contacts={ICU_CONTACTS}
      tip="সরকারি হাসপাতালে আইসিইউ সিট খুব কম। একসাথে কয়েক জায়গায় ফোন করুন।"
      form={<IcuForm />}
    />
  );
}

export function OxygenPage() {
  return (
    <ResourcePage
      id="oxygen"
      title="অক্সিজেন লাগবে?"
      subtitle="সরবরাহকারীকে ফোন করুন, অথবা পোস্ট দিয়ে সবাইকে জানান।"
      contacts={OXYGEN_CONTACTS}
      tip="শ্বাসকষ্ট খুব বেশি হলে দেরি না করে ৯৯৯-এ ফোন করে অ্যাম্বুলেন্স ডাকুন।"
      form={<OxygenForm />}
    />
  );
}
