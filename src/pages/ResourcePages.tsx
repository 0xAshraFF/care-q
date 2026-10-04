import { ArrowDown, PenLine, Phone } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { ContactList } from '../components/ContactList';
import { ShareBar } from '../components/ShareBar';
import { ChipGroup, Field, PageTitle } from '../components/ui';
import { BLOOD_CONTACTS, ICU_CONTACTS, OXYGEN_CONTACTS, type Contact } from '../data/directory';
import { DEFAULT_HOSPITAL } from '../data/hospitals';
import { isValidBdMobile, toBnDigits, toEnDigits } from '../lib/bn';
import { useStoredState } from '../lib/hooks';
import { useWards } from '../state/app';
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

/** One scrolling page: numbers to call first, then the post maker. No tabs to switch. */
function ResourcePage({
  title,
  subtitle,
  contacts,
  tip,
  form,
}: {
  title: string;
  subtitle: string;
  contacts: Contact[];
  tip: string;
  form: ReactNode;
}) {
  const postRef = useRef<HTMLElement>(null);
  return (
    <>
      <PageTitle title={title} subtitle={subtitle} />
      <button
        type="button"
        className="btn btn-soft mb-5 w-full"
        onClick={() => postRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      >
        <PenLine size={19} /> পোস্ট বানাতে চান? <ArrowDown size={18} />
      </button>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 px-1 text-[18px] font-semibold">
          <Phone size={20} className="text-brand-600" /> সরাসরি ফোন করুন
        </h2>
        <ContactList contacts={contacts} tip={tip} />
      </section>

      <section ref={postRef} className="mt-8 scroll-mt-20 space-y-3">
        <div className="px-1">
          <h2 className="flex items-center gap-2 text-[18px] font-semibold">
            <PenLine size={20} className="text-brand-600" /> পোস্ট বানিয়ে শেয়ার করুন
          </h2>
          <p className="text-[15px] text-ink-500">ঘরগুলো পূরণ করলেই লেখা তৈরি হয়ে যাবে।</p>
        </div>
        <div className="card">{form}</div>
      </section>
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
  const [bed, setBed] = useState('');
  const [phone, setPhone] = useStoredState('careq-post-phone', '');
  const { wards } = useWards(DEFAULT_HOSPITAL.id);
  const atDefault = hospital.trim() === DEFAULT_HOSPITAL.nameBn;
  const wardLine = [ward.trim(), bed.trim() && `বেড ${bed.trim()}`].filter(Boolean).join(', ');

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
      <div className="grid grid-cols-[3fr_2fr] gap-2">
        {atDefault ? (
          <Field label="ওয়ার্ড (না দিলেও চলবে)" htmlFor="blood-ward">
            <select id="blood-ward" className="input" value={ward} onChange={(e) => setWard(e.target.value)}>
              <option value="">ওয়ার্ড</option>
              {wards.map((w) => (
                <option key={w.id} value={w.nameBn}>
                  {w.nameBn}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <TextField id="blood-ward" label="ওয়ার্ড (না দিলেও চলবে)" placeholder="যেমন: মেডিসিন" value={ward} onChange={setWard} />
        )}
        <TextField id="blood-bed" label="বেড নম্বর" inputMode="numeric" placeholder="যেমন: ১২" value={bed} onChange={setBed} />
      </div>
      <PhoneField value={phone} onChange={setPhone} />
      <ShareBar
        missing={missing}
        text={bloodMessage({ group: group || ('?' as BloodGroup), bags, when, problem, hospital, ward: wardLine, phone })}
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
      title="অক্সিজেন লাগবে?"
      subtitle="সরবরাহকারীকে ফোন করুন, অথবা পোস্ট দিয়ে সবাইকে জানান।"
      contacts={OXYGEN_CONTACTS}
      tip="শ্বাসকষ্ট খুব বেশি হলে দেরি না করে ৯৯৯-এ ফোন করে অ্যাম্বুলেন্স ডাকুন।"
      form={<OxygenForm />}
    />
  );
}
