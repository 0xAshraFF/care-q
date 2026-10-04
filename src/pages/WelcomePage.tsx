import { ChevronRight, HeartHandshake, Stethoscope } from 'lucide-react';
import { APP_NAME, Logo } from '../components/Chrome';
import { DEFAULT_HOSPITAL } from '../data/hospitals';
import { useApp } from '../state/app';

/** First launch: patients go straight in; doctors go to sign up / log in. Remembered on this phone. */
export function WelcomePage() {
  const { setMode } = useApp();
  const choice = (
    mode: 'patient' | 'doctor',
    Icon: typeof Stethoscope,
    title: string,
    line: string,
  ) => (
    <button
      type="button"
      onClick={() => setMode(mode)}
      className="card flex w-full items-center gap-4 text-left active:bg-brand-50"
    >
      <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-700">
        <Icon size={28} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[19px] leading-snug font-semibold">{title}</span>
        <span className="block text-[15px] leading-snug text-ink-500">{line}</span>
      </span>
      <ChevronRight className="shrink-0 text-brand-600" />
    </button>
  );

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-xl flex-col px-4 pt-10 pb-8">
      <div className="flex items-center gap-3">
        <Logo size={52} />
        <div>
          <p className="text-[26px] leading-tight font-semibold">{APP_NAME}</p>
          <p className="text-[15px] text-ink-500">{DEFAULT_HOSPITAL.nameBn}</p>
        </div>
      </div>
      <h1 className="mt-10 text-[25px] leading-snug font-semibold text-balance">
        রক্ত, আইসিইউ, অক্সিজেন আর ওয়ার্ডের খবর, এক জায়গায়
      </h1>
      <p className="mt-2 text-[16px] text-ink-500">আপনি কে, বেছে নিন।</p>
      <div className="mt-6 space-y-3">
        {choice('patient', HeartHandshake, 'রোগী বা স্বজন', 'রক্ত, আইসিইউ, অক্সিজেনের খোঁজ। লগইন লাগবে না।')}
        {choice('doctor', Stethoscope, 'ডাক্তার বা ওয়ার্ড ইনচার্জ', 'সাইন আপ বা লগইন করুন।')}
      </div>
      <p className="mt-auto pt-10 text-center text-[14px] text-ink-400">পরে ওপরের বোতাম থেকে বদলাতে পারবেন।</p>
    </main>
  );
}
